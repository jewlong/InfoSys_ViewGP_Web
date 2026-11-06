/**
 * @file lv_conf.h
 * LVGL v9 Configuration for InfoSys_ViewGP_Web WebAssembly Runtime
 */

#ifndef LV_CONF_H
#define LV_CONF_H

#include <stdint.h>

/*====================
   COLOR SETTINGS
 *====================*/
/* Color depth: 32 (ARGB8888) for direct HTML5 Canvas ImageData compatibility */
#define LV_COLOR_DEPTH 32

/*=========================
   STDLIB WRAPPER SETTINGS
 *=========================*/
#define LV_USE_STDLIB_MALLOC    LV_STDLIB_CLIB
#define LV_USE_STDLIB_STRING    LV_STDLIB_CLIB
#define LV_USE_STDLIB_SPRINTF   LV_STDLIB_CLIB

/*====================
   HAL SETTINGS
 *====================*/
#define LV_DEF_REFR_PERIOD  16      /* [ms] 60 FPS refresh period */
#define LV_DPI_DEF          130     /* [px/inch] */

/*=================
 * OPERATING SYSTEM
 *=================*/
#define LV_USE_OS   LV_OS_NONE

/*========================
 * RENDERING CONFIGURATION
 *========================*/
#define LV_DRAW_BUF_STRIDE_ALIGN                1
#define LV_DRAW_BUF_ALIGN                       4
#define LV_USE_DRAW_SW                          1
#define LV_DRAW_SW_SUPPORT_RGB565               0
#define LV_DRAW_SW_SUPPORT_RGB888               1
#define LV_DRAW_SW_SUPPORT_XRGB8888             1
#define LV_DRAW_SW_SUPPORT_ARGB8888             1
#define LV_DRAW_SW_COMPLEX                      1
#define LV_DRAW_SW_SHADOW_CACHE_SIZE            0
#define LV_DRAW_SW_CIRCLE_CACHE_SIZE            4

/*==================
 *   FONT USAGE
 *===================*/
#define LV_FONT_MONTSERRAT_12   1
#define LV_FONT_MONTSERRAT_14   1
#define LV_FONT_MONTSERRAT_16   1
#define LV_FONT_MONTSERRAT_20   1
#define LV_FONT_MONTSERRAT_24   1
#define LV_FONT_MONTSERRAT_32   1
#define LV_FONT_DEFAULT         &lv_font_montserrat_16
#define LV_USE_FONT_PLACEHOLDER 1

/*==================
 *  WIDGETS (22 Industrial HMI Widgets)
 *================*/
#define LV_WIDGETS_HAS_DEFAULT_VALUE  1

#define LV_USE_ANIMIMG      1
#define LV_USE_ARC          1   /* New: Arc knob & Gauge arc */
#define LV_USE_BAR          1   /* Bar display */
#define LV_USE_BUTTON       1   /* Button & Momentary Jog */
#define LV_USE_BUTTONMATRIX 1   /* Keypad matrix */
#define LV_USE_CALENDAR     0
#define LV_USE_CANVAS       1   /* Custom drawing */
#define LV_USE_CHART        1   /* Trend chart */
#define LV_USE_CHECKBOX     1   /* Alarm filter checkbox */
#define LV_USE_DROPDOWN     1   /* New: Dropdown selector */
#define LV_USE_IMAGE        1   /* Image widget */
#define LV_USE_IMAGEBUTTON  1
#define LV_USE_KEYBOARD     1   /* Numeric keypad */
#define LV_USE_LABEL        1   /* Text, Number, DateTime */
#define LV_USE_LED          1   /* Indicator & Multistate LED */
#define LV_USE_LINE         1   /* Line & Gauge needle */
#define LV_USE_LIST         1   /* Alarm list */
#define LV_USE_MENU         0
#define LV_USE_MSGBOX       1   /* Popup dialog */
#define LV_USE_ROLLER       1   /* Multi-option roller */
#define LV_USE_SCALE        1   /* Scale & Round Gauge ticks */
#define LV_USE_SLIDER       1   /* New: Slider control */
#define LV_USE_SPAN         1   /* Rich styled text */
#define LV_USE_SPINBOX      1   /* New: Spinbox numeric adjuster */
#define LV_USE_SPINNER      1
#define LV_USE_SWITCH       1   /* Toggle switch */
#define LV_USE_TEXTAREA     1   /* Numeric input field */
#define LV_USE_TABLE        1   /* Table & Alarm grid */
#define LV_USE_TABVIEW      0
#define LV_USE_TILEVIEW     0
#define LV_USE_WIN          1

/*==================
 * THEMES & LAYOUTS
 *==================*/
#define LV_USE_THEME_DEFAULT 1
#define LV_THEME_DEFAULT_DARK 1
#define LV_USE_FLEX 1
#define LV_USE_GRID 1

#endif /* LV_CONF_H */
