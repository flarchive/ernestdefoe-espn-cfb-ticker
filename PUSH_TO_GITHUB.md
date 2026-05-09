# How to push this extension to GitHub

## One-time setup (if you haven't cloned the repo yet)

```bash
git clone https://github.com/ernestdefoe/espn-cfb-ticker.git
cd espn-cfb-ticker
```

## Copy these files into the cloned repo

Unzip `espn-cfb-ticker.zip` and copy everything into your cloned folder,
replacing the LICENSE file if prompted (the zip includes it).

```bash
# From the folder where you unzipped:
cp -r espn-cfb-ticker/. /path/to/your/cloned/espn-cfb-ticker/
```

## Push to GitHub

```bash
cd /path/to/your/cloned/espn-cfb-ticker

git add -A
git commit -m "feat: initial Flarum 2 ESPN CFB Ticker extension"
git push origin main
```

## What happens next (automatic)

GitHub Actions will trigger `.github/workflows/build.yml` which:
1. Installs npm dependencies (`flarum-webpack-config`, etc.)
2. Runs `npm run build` to produce real `js/dist/forum.js` and `js/dist/admin.js`
3. Auto-commits the built files back to `main` with the message `chore: build JS assets [skip ci]`

You can watch it run at:
https://github.com/ernestdefoe/espn-cfb-ticker/actions

The whole process takes about 60–90 seconds.

## After CI finishes

Your repo will have real compiled JS in `js/dist/`. From that point on,
any time you edit `js/src/**` and push to `main`, CI rebuilds automatically.
