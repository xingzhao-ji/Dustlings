shader_type spatial;
render_mode cull_back;
// Static world/mesh coordinates. No TIME, screen-space noise or normal flutter.
// Grain fades with projected frequency; the representative arrival remains quiet.
uniform int material_kind = 0; // 0: stone/grass, 1: plaster/stone, 2: wood
varying vec3 world_position;

vec3 palette_color(vec3 authored) {
    if (OUTPUT_IS_SRGB) { return authored; }
    return mix(authored / 12.92, pow((authored + vec3(0.055)) / 1.055, vec3(2.4)), step(vec3(0.04045), authored));
}
float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}
float soft_noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i), hash31(i+vec3(1,0,0)), f.x), mix(hash31(i+vec3(0,1,0)), hash31(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash31(i+vec3(0,0,1)), hash31(i+vec3(1,0,1)), f.x), mix(hash31(i+vec3(0,1,1)), hash31(i+vec3(1,1,1)), f.x), f.y), f.z);
}
void vertex() {
    world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
void fragment() {
    // Keep this candidate local to the entry lane, near home and Ivo meeting.
    float arrival = (1.0 - smoothstep(11.5, 15.0, abs(world_position.x))) * smoothstep(-4.0, -1.5, world_position.z) * (1.0 - smoothstep(11.5, 15.0, world_position.z));
    vec3 authored = COLOR.rgb;
    float rough = 0.86;
    float specular = 0.30;
    float variation = 0.0;
    if (material_kind == 0) {
        bool grass = authored.g > authored.r + 0.015;
        if (grass) {
            float broad = soft_noise(vec3(world_position.xz * 0.19, 4.7));
            float wide = soft_noise(vec3(world_position.xz * 0.061, 8.1));
            authored *= mix(1.0, 0.91 + broad * 0.12 + wide * 0.055, arrival);
            authored = mix(authored, authored * vec3(0.92,0.965,0.975), arrival);
            rough = 0.98;
            specular = 0.10;
        } else {
            vec3 sample_position = world_position * 15.0;
            float filtered = 1.0 - smoothstep(0.18, 0.72, length(fwidth(sample_position)));
            variation = (soft_noise(sample_position) - 0.5) * 0.044 * filtered;
            variation += (soft_noise(world_position * 1.8) - 0.5) * 0.012;
            rough = 0.91;
            specular = 0.16;
        }
    } else if (material_kind == 1) {
        vec3 sample_position = world_position * 18.0;
        float filtered = 1.0 - smoothstep(0.18, 0.72, length(fwidth(sample_position)));
        variation = (soft_noise(sample_position) - 0.5) * 0.025 * filtered;
        rough = 0.95;
        specular = 0.12;
    } else {
        // Box-face UVs hold broad directional fibres in the joinery itself.
        vec3 fibre = vec3(UV.x * 1.1, UV.y * 13.0, 2.6);
        float filtered = 1.0 - smoothstep(0.18, 0.72, length(fwidth(fibre)));
        variation = (soft_noise(fibre) - 0.5) * 0.032 * filtered;
        rough = 0.85;
        specular = 0.23;
    }
    ALBEDO = palette_color(clamp(authored * (1.0 + variation * arrival), 0.0, 1.0));
    ROUGHNESS = mix(0.86, rough, arrival);
    SPECULAR = mix(0.30, specular, arrival);
}
