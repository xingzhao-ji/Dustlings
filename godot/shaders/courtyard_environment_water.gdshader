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
    float ripple = sin(length(VERTEX.xz) * 13.0 - time_seconds * 2.2);
    VERTEX.y += ripple * 0.006 * restoration * motion_amount;
}
void fragment() {
    float waves = sin(UV.x * 38.0 + UV.y * 25.0 - time_seconds * 0.8 * motion_amount);
    vec3 deep = vec3(0.18, 0.43, 0.40);
    vec3 clear = vec3(0.39, 0.68, 0.59);
    ALBEDO = palette_color(mix(deep, clear, 0.45 + waves * 0.055));
    ROUGHNESS = 0.27;
    METALLIC = 0.03;
    SPECULAR = 0.62;
    EMISSION = palette_color(clear) * 0.035 * restoration;
}
