shader_type spatial;
render_mode cull_back;
uniform float restoration : hint_range(0.0, 1.0) = 0.0;
uniform float motion_amount : hint_range(0.0, 1.0) = 1.0;
uniform float time_seconds = 0.0;
// Authored palette is sRGB. Compatibility works in sRGB; Forward+/Mobile in linear.
vec3 palette_color(vec3 authored) {
    if (OUTPUT_IS_SRGB) { return authored; }
    return mix(authored / 12.92, pow((authored + vec3(0.055)) / 1.055, vec3(2.4)), step(vec3(0.04045), authored));
}
void vertex() {
    float rooted_height = max(0.0, VERTEX.y - 0.35);
    VERTEX.x += sin(time_seconds * 0.7 + VERTEX.x * 1.3 + VERTEX.z) * rooted_height * 0.012 * restoration * motion_amount;
}
void fragment() {
    vec3 sleepy = COLOR.rgb * vec3(0.83, 0.78, 0.62);
    ALBEDO = palette_color(mix(sleepy, COLOR.rgb, 0.25 + restoration * 0.75));
    ROUGHNESS = 0.91;
    SPECULAR = 0.22;
}
