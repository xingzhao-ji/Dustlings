const {app,BrowserWindow,Menu,protocol,net,powerMonitor,dialog} = require('electron');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const APP_URL='dustlings://courtyard/index.html';
protocol.registerSchemesAsPrivileged([{scheme:'dustlings',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
// Explicit automation profiles never touch a player's normal save directory.
const testProfile=process.env.DUSTLINGS_TEST_USER_DATA;
if(testProfile)app.setPath('userData',path.resolve(testProfile));
app.setName('Dustlings');
let window,closing=false,quitting=false;
const pauseAndSave=`(async()=>{
  const welcome=document.getElementById('welcome');
  if(welcome&&!welcome.open&&!document.querySelector('dialog[open]'))document.getElementById('pause-button').click();
  if(navigator.locks)await navigator.locks.request('dustlings.courtyard.v1',()=>{});
})()`;
async function preserve(){
  if(window&&!window.isDestroyed()&&!window.webContents.isDestroyed()){
    await window.webContents.executeJavaScript(pauseAndSave);
    window.webContents.session.flushStorageData();
  }
}
async function createWindow(){
  window=new BrowserWindow({width:1280,height:820,minWidth:960,minHeight:640,title:'Dustlings',backgroundColor:'#ede7d7',show:false,
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:true}});
  const contents=window.webContents;
  contents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  contents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,callback)=>callback({cancel:true}));
  contents.setWindowOpenHandler(()=>({action:'deny'}));
  contents.on('will-navigate',(event,url)=>{if(!url.startsWith(APP_URL))event.preventDefault();});
  contents.session.on('will-download',(_event,item)=>{
    item.setSaveDialogOptions({title:'Keep a Dustlings save',defaultPath:path.join(app.getPath('documents'),item.getFilename()),filters:[{name:'Dustlings save',extensions:['json']}]});
  });
  window.on('close',event=>{
    if(closing)return;
    event.preventDefault();
    closing=true;
    preserve().then(()=>{window.destroy();if(quitting||process.platform!=='darwin')app.quit();}).catch(async error=>{
      closing=false;
      await dialog.showMessageBox(window,{type:'error',title:'Your courtyard is still open',message:'Dustlings could not finish saving before closing.',detail:'Use Pause → Export save to keep a backup, then try closing again. '+error.message,buttons:['Keep playing']});
    });
  });
  window.on('closed',()=>{window=null;closing=false;});
  window.once('ready-to-show',()=>{if(process.env.DUSTLINGS_TEST_HIDDEN!=='1')window.show();});
  await contents.loadURL(APP_URL+(process.env.DUSTLINGS_TEST_QA==='1'?'?qa=1':''));
}
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
else app.whenReady().then(async()=>{
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  protocol.handle('dustlings',request=>{
    const url=new URL(request.url);
    if(url.hostname!=='courtyard'||url.pathname!=='/index.html')return new Response('Not found',{status:404});
    return net.fetch(pathToFileURL(path.join(__dirname,'game.html')).href);
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform==='darwin'?[{label:'Dustlings',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]}]:[]),
    {label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'Window',submenu:[{role:'minimize'},{role:'togglefullscreen'},...(process.platform==='darwin'?[]:[{role:'quit'}])]}
  ]));
  powerMonitor.on('suspend',()=>{preserve().catch(()=>{});});
  powerMonitor.on('lock-screen',()=>{preserve().catch(()=>{});});
  await createWindow();
  app.on('activate',()=>{if(!window)createWindow();});
});
app.on('before-quit',event=>{if(window&&!window.isDestroyed()&&!closing){event.preventDefault();quitting=true;window.close();}});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
