# Domain Setup Guide – Make Site Work on www.mlmunion.in

Your app runs locally. To make it work when users visit **www.mlmunion.in** or **mlmunion.in**, do the following.

---

## 1. IIS bindings (host name)

IIS must know that requests to your **domain** should go to the **www.mlmunion.in** site.

### Steps

1. In **IIS Manager**, select the **www.mlmunion.in** site (left pane).
2. In the **Actions** pane (right), click **Bindings...**.
3. In **Site Bindings**:
   - If there is already a binding for **port 80**, select it and click **Edit**.
   - If not, click **Add**.

4. Set:
   - **Type:** `http`
   - **IP address:** `All Unassigned` (or your server IP, e.g. `38.225.205.185`)
   - **Port:** `80`
   - **Host name:** `www.mlmunion.in`

5. Click **OK**.

6. Add a second binding for the **non‑www** domain:
   - Click **Add** again.
   - **Type:** `http`
   - **IP address:** `All Unassigned` (or same IP)
   - **Port:** `80`
   - **Host name:** `mlmunion.in`

7. Click **OK** and then **Close**.

Result:  
- `http://www.mlmunion.in` → www.mlmunion.in site  
- `http://mlmunion.in` → same site (if you want non‑www to work).

---

## 2. DNS (domain → server IP)

Your domain must point to the server IP **38.225.205.185** (from your IIS bindings).

At your **domain registrar** (where you bought mlmunion.in), add or check:

| Type | Name / Host | Value        | TTL (optional) |
|------|-------------|-------------|------------------|
| A    | `@`         | 38.225.205.185 | 300–3600       |
| A    | `www`       | 38.225.205.185 | 300–3600       |

- **@** = `mlmunion.in`
- **www** = `www.mlmunion.in`

Save and wait 5–30 minutes (up to 48 hours in rare cases).

Check from your PC:

```bash
ping mlmunion.in
ping www.mlmunion.in
```

Both should show **38.225.205.185**.

---

## 3. Optional: redirect mlmunion.in → www.mlmunion.in

If you want **mlmunion.in** to always open **www.mlmunion.in**, add a redirect in **web.config** (only if you’re sure no other rule depends on the order).

In `web.config`, inside `<system.webServer>`, **before** the existing `<rewrite><rules>`, you can add:

```xml
<rewrite>
  <rules>
    <!-- Redirect non-www to www -->
    <rule name="Redirect to www" stopProcessing="true">
      <match url="(.*)" />
      <conditions>
        <add input="{HTTP_HOST}" pattern="^mlmunion\.in$" />
      </conditions>
      <action type="Redirect" url="http://www.mlmunion.in/{R:1}" redirectType="Permanent" />
    </rule>
    <!-- ... rest of your existing rules ... -->
  </rules>
</rewrite>
```

(If you already have a `<rewrite>` block, add this rule as the **first** rule inside `<rules>`.)

---

## 4. Test the domain

1. Restart the site (or IIS):
   - In IIS Manager: **Sites** → **www.mlmunion.in** → **Restart** (or run `iisreset` in CMD).
2. In browser (or from your PC):
   - `http://www.mlmunion.in`
   - `http://mlmunion.in`
3. If you see **500** or another error:
   - Check **iisnode** logs:  
     `C:\HostingSpaces\vista\www.mlmunion.in\iisnode\`  
     Open the latest **stderr-*.txt** and use the error message to fix (e.g. missing env, wrong path, permissions).

---

## 5. Checklist

- [ ] **Bindings:**  
  - One binding with **Host name** = `www.mlmunion.in`, port 80.  
  - One binding with **Host name** = `mlmunion.in`, port 80 (if you want non‑www).
- [ ] **DNS:**  
  - A record for `@` → 38.225.205.185.  
  - A record for `www` → 38.225.205.185.  
  - `ping mlmunion.in` and `ping www.mlmunion.in` both resolve to that IP.
- [ ] **Restart** site or IIS after changing bindings.
- [ ] **Test** in browser: `http://www.mlmunion.in`.
- [ ] If it still doesn’t run on domain, check **iisnode** logs and error message.

---

## 6. If it works by IP but not by domain

- **Works:** `http://38.225.205.185`  
- **Fails:** `http://www.mlmunion.in`

Then:

1. **Bindings:** Confirm **Host name** is exactly `www.mlmunion.in` (and `mlmunion.in` if you use it) on port 80.
2. **DNS:** Confirm `ping www.mlmunion.in` returns 38.225.205.185.
3. **Default site:** If “Default Web Site” or another site is bound to port 80 with no host name (or with the same host), it can “take” the request. Ensure only **www.mlmunion.in** (and optionally **mlmunion.in**) use that binding for this app, or that the correct site has higher priority.

---

## 7. Quick reference

| Step            | Where              | What to set |
|-----------------|--------------------|-------------|
| Bindings        | IIS → Site → Bindings | Host name: `www.mlmunion.in` and `mlmunion.in`, Port: 80 |
| DNS             | Domain registrar  | A @ → 38.225.205.185, A www → 38.225.205.185 |
| Restart         | IIS               | Restart site or `iisreset` |
| Test            | Browser           | `http://www.mlmunion.in` |

After bindings and DNS are correct, the site should run on the domain the same way it runs locally.
