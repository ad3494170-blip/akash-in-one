# AKAZA Likes Store

## Deploy on Render (mobile-friendly)

1. Upload these project files to a GitHub repository (keep the folders as-is).
2. In Render choose **New + → Blueprint** and select the repository containing `render.yaml`, or create a **Web Service** for the repo.
3. For a Web Service use:
   - Runtime: Node
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
4. In Render → Environment, set `FAMGATEWAY_API_KEY` to your private FamGateway API key. Never put the key in frontend code or commit it to GitHub.
5. Deploy. Open the `onrender.com` URL shown by Render.

## Important

- This app uses a JSON file (`data/store.json`) for storage. Render's free filesystem may be ephemeral, so records can be lost on redeploy/restart. For real customer payments/orders, configure persistent storage or migrate to a managed database before production.
- Live UPI payment verification requires valid FamGateway credentials and an API/status endpoint that matches the current provider documentation. Do not treat a QR scan or screenshot as proof of payment.
- Free Render services may sleep after inactivity.
- The admin account/bootstrap flow must be reviewed before accepting real payments. Change any default secrets and keep credentials private.
