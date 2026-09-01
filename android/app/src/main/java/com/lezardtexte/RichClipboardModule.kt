package com.lezardtexte

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Нативный модуль rich clipboard для LÉZARD TEXTE.
 *
 * Копирует текст одновременно как plain text и как styled HTML
 * через ClipData.newHtmlText — так Telegram Android при обычной
 * вставке понимает жирный/курсив/подчёркивание/цитаты.
 */
class RichClipboardModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "RichClipboard"

    private fun clipboard(): ClipboardManager? =
        reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager

    @ReactMethod
    fun copyRich(html: String, plain: String, promise: Promise) {
        try {
            val cm = clipboard()
            if (cm == null) {
                promise.reject("NO_CLIPBOARD", "Clipboard unavailable")
                return
            }
            val clip = ClipData.newHtmlText("LÉZARD TEXTE", plain, html)
            cm.setPrimaryClip(clip)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e)
        }
    }

    @ReactMethod
    fun copyText(plain: String, promise: Promise) {
        try {
            val cm = clipboard()
            if (cm == null) {
                promise.reject("NO_CLIPBOARD", "Clipboard unavailable")
                return
            }
            val clip = ClipData.newPlainText("LÉZARD TEXTE", plain)
            cm.setPrimaryClip(clip)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e)
        }
    }

    /**
     * Диагностика: читает HTML из системного буфера, чтобы проверить,
     * что rich clipboard реально содержит HTML (text/html MIME).
     */
    @ReactMethod
    fun readClipboardHtml(promise: Promise) {
        try {
            val cm = clipboard()
            val clip = cm?.primaryClip
            if (clip == null || clip.itemCount < 1) {
                promise.resolve(mapOf("present" to false, "html" to ""))
                return
            }
            val html = clip.getItemAt(0).htmlText
            val mimes = if (clip.description.mimeTypeCount > 0) {
                (0 until clip.description.mimeTypeCount)
                    .joinToString(",") { clip.description.getMimeType(it) }
            } else {
                ""
            }
            promise.resolve(
                mapOf(
                    "present" to (html != null && html.isNotEmpty()),
                    "html" to (html ?: ""),
                    "mimes" to mimes,
                )
            )
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e)
        }
    }
}
