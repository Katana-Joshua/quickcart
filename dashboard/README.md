# QuickCart Dashboard

The admin dashboard lives inside the main `quickcart` backend project.

From this folder's parent (`quickcart`), run:

```powershell
npm run dev
```

That starts:

- Dashboard on `http://localhost:3000`
- API on `http://localhost:3000/api`

The dashboard only accepts users with `users.is_admin = TRUE`.

Create or promote an admin from the `quickcart` folder, then use that email and password on the dashboard login screen:

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="change-me"
npm run create-admin
```

