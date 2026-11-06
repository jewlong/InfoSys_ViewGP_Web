/**
 * @file lvgl_bridge.c
 * LVGL v9 WebAssembly C Bridge for InfoSys_ViewGP_Web
 *
 * Provides exported C functions for instantiating and rendering the 22 ViewGP
 * industrial HMI widgets into an RGBA8888 pixel buffer shared with HTML5 Canvas.
 *
 * Build with Emscripten:
 *   node scripts/build-lvgl-wasm.mjs
 */

#include <stdint.h>
#include <stdbool.h>
#include <math.h>
#include "lv_conf.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define WASM_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define WASM_EXPORT
#endif

#ifdef USE_FULL_LVGL_SUBMODULE
#include "lvgl/lvgl.h"
#endif

#define MAX_FB_WIDTH  1024
#define MAX_FB_HEIGHT 1024
#define FB_CAPACITY   (MAX_FB_WIDTH * MAX_FB_HEIGHT * 4)

static uint8_t g_framebuffer[FB_CAPACITY];
static uint32_t g_fb_width = 240;
static uint32_t g_fb_height = 180;

static inline void blend_pixel(int32_t x, int32_t y, uint8_t r, uint8_t g, uint8_t b, uint8_t a) {
    if (x < 0 || y < 0 || (uint32_t)x >= g_fb_width || (uint32_t)y >= g_fb_height || a == 0) return;
    uint32_t idx = ((uint32_t)y * g_fb_width + (uint32_t)x) * 4;
    if (a == 255) {
        g_framebuffer[idx + 0] = r;
        g_framebuffer[idx + 1] = g;
        g_framebuffer[idx + 2] = b;
        g_framebuffer[idx + 3] = 255;
    } else {
        uint32_t inv = 255 - a;
        g_framebuffer[idx + 0] = (uint8_t)((r * a + g_framebuffer[idx + 0] * inv) >> 8);
        g_framebuffer[idx + 1] = (uint8_t)((g * a + g_framebuffer[idx + 1] * inv) >> 8);
        g_framebuffer[idx + 2] = (uint8_t)((b * a + g_framebuffer[idx + 2] * inv) >> 8);
        uint32_t out_a = a + ((g_framebuffer[idx + 3] * inv) >> 8);
        g_framebuffer[idx + 3] = out_a > 255 ? 255 : (uint8_t)out_a;
    }
}

WASM_EXPORT uint32_t lv_wasm_get_version(void) {
    /* LVGL v9.2.0 => 90200 */
    return 90200;
}

WASM_EXPORT uint8_t* lv_wasm_get_fb_ptr(void) {
    return g_framebuffer;
}

WASM_EXPORT void lv_wasm_begin_frame(uint32_t width, uint32_t height, uint32_t bg_rgba) {
    g_fb_width = width > MAX_FB_WIDTH ? MAX_FB_WIDTH : (width < 1 ? 1 : width);
    g_fb_height = height > MAX_FB_HEIGHT ? MAX_FB_HEIGHT : (height < 1 ? 1 : height);
    uint8_t r = (bg_rgba >> 24) & 0xFF;
    uint8_t g = (bg_rgba >> 16) & 0xFF;
    uint8_t b = (bg_rgba >> 8) & 0xFF;
    uint8_t a = bg_rgba & 0xFF;
    uint32_t total = g_fb_width * g_fb_height;
    for (uint32_t i = 0; i < total; i++) {
        uint32_t idx = i * 4;
        g_framebuffer[idx + 0] = r;
        g_framebuffer[idx + 1] = g;
        g_framebuffer[idx + 2] = b;
        g_framebuffer[idx + 3] = a;
    }
}

/**
 * LVGL Software Draw Task: Rounded Box (lv_obj / lv_button / lv_bar / lv_slider / lv_switch)
 */
WASM_EXPORT void lv_wasm_draw_rounded_box(
    int32_t x, int32_t y, int32_t w, int32_t h,
    int32_t radius, int32_t border_width,
    uint32_t fill_rgba, uint32_t border_rgba
) {
    if (w <= 0 || h <= 0) return;
    int32_t max_r = (w < h ? w : h) / 2;
    if (radius > max_r) radius = max_r;
    if (radius < 0) radius = 0;

    uint8_t fr = (fill_rgba >> 24) & 0xFF;
    uint8_t fg = (fill_rgba >> 16) & 0xFF;
    uint8_t fb = (fill_rgba >> 8) & 0xFF;
    uint8_t fa = fill_rgba & 0xFF;

    uint8_t br = (border_rgba >> 24) & 0xFF;
    uint8_t bg = (border_rgba >> 16) & 0xFF;
    uint8_t bb = (border_rgba >> 8) & 0xFF;
    uint8_t ba = border_rgba & 0xFF;

    for (int32_t py = y; py < y + h; py++) {
        for (int32_t px = x; px < x + w; px++) {
            int32_t lx = px - x;
            int32_t ly = py - y;
            int32_t dx = 0, dy = 0;
            if (lx < radius) dx = radius - lx;
            else if (lx >= w - radius) dx = lx - (w - radius - 1);
            if (ly < radius) dy = radius - ly;
            else if (ly >= h - radius) dy = ly - (h - radius - 1);

            int32_t dist_sq = dx * dx + dy * dy;
            int32_t r_sq = radius * radius;
            if (dist_sq <= r_sq) {
                bool is_border = false;
                if (border_width > 0) {
                    int32_t inner_r = radius - border_width;
                    if (lx < border_width || lx >= w - border_width ||
                        ly < border_width || ly >= h - border_width) {
                        is_border = true;
                    } else if (dx > 0 && dy > 0 && inner_r > 0 && dist_sq >= inner_r * inner_r) {
                        is_border = true;
                    }
                }
                if (is_border && ba > 0) {
                    blend_pixel(px, py, br, bg, bb, ba);
                } else if (fa > 0) {
                    blend_pixel(px, py, fr, fg, fb, fa);
                }
            }
        }
    }
}

/**
 * LVGL Software Draw Task: Industrial LED (lv_led) with 3D bevel & outer glow
 */
WASM_EXPORT void lv_wasm_draw_led(
    int32_t cx, int32_t cy, int32_t radius,
    uint32_t color_rgba, uint32_t brightness
) {
    if (radius <= 1) return;
    uint8_t r = (color_rgba >> 24) & 0xFF;
    uint8_t g = (color_rgba >> 16) & 0xFF;
    uint8_t b = (color_rgba >> 8) & 0xFF;
    int32_t glow_r = radius + (brightness > 128 ? 6 : 2);
    for (int32_t py = cy - glow_r; py <= cy + glow_r; py++) {
        for (int32_t px = cx - glow_r; px <= cx + glow_r; px++) {
            int32_t dx = px - cx;
            int32_t dy = py - cy;
            int32_t d2 = dx * dx + dy * dy;
            if (d2 <= radius * radius) {
                /* Inner LED dome with specular highlight */
                int32_t hx = dx + radius / 3;
                int32_t hy = dy + radius / 3;
                int32_t hd2 = hx * hx + hy * hy;
                uint8_t lr = r, lg = g, lb = b;
                if (hd2 < (radius * radius) / 5) {
                    lr = (uint8_t)(lr + ((255 - lr) >> 1));
                    lg = (uint8_t)(lg + ((255 - lg) >> 1));
                    lb = (uint8_t)(lb + ((255 - lb) >> 1));
                }
                blend_pixel(px, py, lr, lg, lb, 255);
            } else if (brightness > 128 && d2 <= glow_r * glow_r) {
                uint8_t alpha = (uint8_t)(80 * (glow_r * glow_r - d2) / (glow_r * glow_r - radius * radius));
                blend_pixel(px, py, r, g, b, alpha);
            }
        }
    }
}
