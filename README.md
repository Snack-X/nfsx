# nfsx - Node.js File Server Extended

## Install

1. Clone this repository.
2. Open your terminal.
3. Go to `/path/to/nfsx`.
4. Run `npm install` to install dependencies.
5. Run `cp data/config_default.json data/config.json`
6. Open `data/config.json` with your favorite editor.
  * Set `port` to the port you want.
  * Change `secret` to long, random string.
  * If you use nfsx behind reverse proxy, set `trustProxy` to `true` for correct ip in logs.
7. `node index.js`.
  * You can use `forever`, or something similar to it.

## Basic config

1. Open your browser, and go to `server:port`.
2. Login with `admin:admin`.
3. Go to `Admin`, and `Account`.
4. Select `admin` from account list, and change password to your password.
  * You also can change ID.
5. After changing account information, you will be logged out.
6. And you can use nfsx as you want. Add filesystem entry, add account.
