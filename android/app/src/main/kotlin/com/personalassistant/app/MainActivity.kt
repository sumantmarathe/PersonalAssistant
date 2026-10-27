package com.personalassistant.app

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var googleSignInClient: GoogleSignInClient

    private val signInLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)
                if (account != null && account.account != null) {
                    lifecycleScope.launch(Dispatchers.IO) {
                        try {
                            val scopeString = "oauth2:https://www.googleapis.com/auth/drive.file"
                            val token = GoogleAuthUtil.getToken(this@MainActivity, account.account!!, scopeString)
                            val email = account.email ?: ""
                            val name = account.displayName ?: "Google User"
                            val photo = account.photoUrl?.toString() ?: ""
                            withContext(Dispatchers.Main) {
                                webView.evaluateJavascript(
                                    "if (window.googleDriveService && window.googleDriveService.handleNativeAuthSuccess) { window.googleDriveService.handleNativeAuthSuccess('$token', '$email', '$name', '$photo'); }",
                                    null
                                )
                            }
                        } catch (e: Exception) {
                            val msg = (e.message ?: "Authentication failed").replace("'", "\\'")
                            withContext(Dispatchers.Main) {
                                webView.evaluateJavascript(
                                    "if (window.googleDriveService && window.googleDriveService.handleNativeAuthError) { window.googleDriveService.handleNativeAuthError('$msg'); }",
                                    null
                                )
                            }
                        }
                    }
                }
            } catch (e: ApiException) {
                val msg = "Sign-in failed (Code ${e.statusCode})".replace("'", "\\'")
                webView.evaluateJavascript(
                    "if (window.googleDriveService && window.googleDriveService.handleNativeAuthError) { window.googleDriveService.handleNativeAuthError('$msg'); }",
                    null
                )
            }
        } else {
            webView.evaluateJavascript(
                "if (window.googleDriveService && window.googleDriveService.handleNativeAuthError) { window.googleDriveService.handleNativeAuthError('Google Sign-In was cancelled.'); }",
                null
            )
        }
    }

    inner class AndroidNativeBridge {
        @JavascriptInterface
        fun isAndroid(): Boolean = true

        @JavascriptInterface
        fun requestGoogleSignIn() {
            runOnUiThread {
                val signInIntent = googleSignInClient.signInIntent
                signInLauncher.launch(signInIntent)
            }
        }

        @JavascriptInterface
        fun requestGoogleSignOut() {
            googleSignInClient.signOut()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(Scope("https://www.googleapis.com/auth/drive.file"))
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)

        WebView.setWebContentsDebuggingEnabled(true)

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                mediaPlaybackRequiresUserGesture = false
            }

            addJavascriptInterface(AndroidNativeBridge(), "AndroidNativeBridge")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val url = request.url.toString()
                    if (url.startsWith("file:") || url.contains("sumantmarathe.github.io")) {
                        return false
                    }
                    return false
                }
            }

            webChromeClient = WebChromeClient()
        }

        setContentView(webView)

        // Load bundled assets for instant offline availability
        webView.loadUrl("file:///android_asset/www/index.html")

        // Handle native back button
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
