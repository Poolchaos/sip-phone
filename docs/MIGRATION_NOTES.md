
## Branched off from original project

at hash 978dcdf4835e94625264790f4f1e1421a2bec6d7

---


Some direct routes

chrome-extension://lmdbpananjhnangbdfjmippannhgicog/index.html#/media - First route we converted from flat file to a "route"

chrome-extension://lmdbpananjhnangbdfjmippannhgicog/index.html#/popup (Login)
chrome-extension://lmdbpananjhnangbdfjmippannhgicog/index.html#/options (Login)

## Content Security Policy (Specific for dev)


this was the original setting

```json
"content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'",
```

Check Manual Manifest permissions:

- "*://localhost/*"

Allows HMR by eliminating CORS restriction from chrome-extension://myhash to http://localhost


---

## Routes

### app.ts

/
    moduleId: PLATFORM.moduleName('./views/chrome/initialise/initialise'),
/background
    moduleId: PLATFORM.moduleName('./views/chrome/background/background'),
/options
    moduleId: PLATFORM.moduleName('./views/chrome/options/options'),'),


### widget.ts

/popup
    moduleId: PLATFORM.moduleName('./views/chrome/widget/widget'),

    /popup/login
        moduleId: PLATFORM.moduleName('../../common/login/login'),
    /popup/phone
        moduleId: PLATFORM.moduleName('../../common/phone/phone'),
    /popup/disconnected
        moduleId: PLATFORM.moduleName('../../common/disconnected/disconnected'),

---

### chrome.windows.create

We only use this to create a "dev" window. so consider adding these permissions in dev mode/build only:

```
"permissions": [
    ...
    "contextMenus",
    "tabs",
    "*://localhost/*"
    ...
  ]
```