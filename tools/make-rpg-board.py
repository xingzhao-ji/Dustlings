from pathlib import Path
import base64,html
out=Path('docs/art-direction');out.mkdir(exist_ok=True,parents=True)
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1060" viewBox="0 0 1600 1060"><rect width="1600" height="1060" fill="#f1ead8"/><style>text{font-family:Arial,sans-serif;fill:#304e45}.title{font-size:34px;font-weight:bold}.sub{font-size:18px}.h{font-size:23px;font-weight:bold}.b{font-size:18px}.small{font-size:15px}</style>']
def text(x,y,s,cls='b'): parts.append(f'<text x="{x}" y="{y}" class="{cls}">{html.escape(s)}</text>')
def lines(x,y,ss):
 for i,s in enumerate(ss):text(x,y+i*25,s)
text(36,50,'DUSTLINGS  /  A SMALL WORLD WITH ROOM FOR YOU','title')
text(36,80,'Art direction 01 • hypotheses for matched gameplay review • Bellwether opening • 10 September 2026','sub')
text(36,115,'Quality reference: Sky — luminous depth, clear silhouettes, graceful timing. Original Dustlings shapes and identity.','sub')
for x,stem,title,tc in [(36,'arrival','ARRIVE / an inviting path','00:02–00:11'),(560,'ivo','MEET / the person beyond the task','00:11–00:16'),(1084,'letter','DISCOVER / a visible exchange','01:49–01:59')]:
 p=Path('evidence/rpg/neighborhood-integrated')/(stem+'.png');data=base64.b64encode(p.read_bytes()).decode()
 parts.append(f'<image x="{x}" y="138" width="480" height="300" href="data:image/png;base64,{data}"/>')
 text(x,469,title,'h');text(x,495,'BEFORE: native gameplay '+tc,'small')
text(36,540,'SHAPE + SCALE','h')
lines(36,572,['Soft cut stone; hand-set joints; rounded joinery.','Resident 1.55 m / companion 0.50 m.','Friendly face, readable hands, stable foot soles.','Keep roofs and props clear of faces and doorways.'])
text(560,540,'LIGHT + MATERIAL','h')
lines(560,572,['Warm attention in a cooler garden surround.','One readable lantern → crossing → glasshouse.','Plaster: broad matte. Stone: quiet mineral grain.','Wood: directional grain. Cloth: soft, no hard shine.'])
text(1084,540,'MOVEMENT + MOMENT','h')
lines(1084,572,['Weight shifts over a planted foot; no idle bobbing.','Notice → orient → gesture → settle back to work.','Protect dust curl and moth / helper contact.','No camera sweep required to see the reward.'])
text(36,705,'WORKING PALETTE / KEEP CREAM, SAGE AND CLAY; SEPARATE THEIR VALUES','h')
colors=[('Plaster','#e4d7ba'),('Stone','#c4b898'),('Wood','#9b7354'),('Leaf','#527d65'),('Shade','#2f4f4a'),('Cloth','#8ea695'),('Paper','#d5c6a2'),('Light','#ffe7b4')]
for i,(n,c) in enumerate(colors):
 x=36+i*194;parts.append(f'<rect x="{x}" y="732" width="174" height="70" rx="12" fill="{c}"/>');text(x,827,n,'b');text(x,849,c,'small')
text(36,899,'FIRST REPRESENTATIVE LOCATION: ARRIVAL LANE + LANTERN + IVO MEETING','h')
lines(36,931,['Compare the same route at 1280×800, 52° FOV, 7.6 m camera; add deliberate orbit and interrupted turns.','Three priorities: visible discovery continuity; individual resident acting; arrival light / material hierarchy.','Preserve readable birth, grounded proportions, stable controls, paper UI and restrained companion light.'])
text(36,1024,'Board is a target, not proof. Actual moving gameplay and human review determine whether it works. Figma unavailable.','small')
parts.append('</svg>');(out/'bellwether-direction.svg').write_text(''.join(parts))
