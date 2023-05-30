### If you're looking for the original readme you can look [here](https://github.com/pauloamgomes/contentful-better-slugs)

# Installation

- Clone this repo locally
- Go to `extension.json` here you will find an `id` property. This will `id` is used as the slug of the extension. It is important that this is set since we have a github action that syncs this extension to production from staging. If this extension is installed outside of this installtaion readme it'll generate a unique slug that will be different from staging and production.
- Install [contentful-cli](https://www.contentful.com/developers/docs/tools/cli/).
- Find your management token in contentful and use it to login. `contentful login --management-token {{your-token}}`
- run `contentful space use` and select the space you want to push this extension to
- run `contentful space environment use` and select `staging` - never do this for production because it'll always be overwritten by staging thanks to the github action
- run `yarn` to install the dependencies, probably optional
- run `yarn build` to make sure the `/build` directory is up to date. Probably optional because we commit `/build` folder to the repo
- run `contentful extension update --force` this will create the extension even if it did not exist in the first place
