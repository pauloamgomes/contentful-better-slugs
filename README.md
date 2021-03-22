# Contentful Better Slugs

The Better Slugs is a simple UI extension for Contentful CMS that provides a more enhanced way to deal with slug fields.
The existing slug functionality in Contentful is limited to one field (title) and therefore a bit limited for most of cases like:

- Work with Gatsby Preview
- Ability to automatically generate the slug with information from other fields (including referenced fields)
- Autogeneration of slug doesn't end when the entry is published

## Overview

The extension has the following features:

- Generate a dynamic slug based on a pattern defined for each Content Model

![Screenshot](https://i.snipboard.io/zMLGUX.jpg)

## Requirements

- Contentful CMS account with permissions to manage extensions

## Instalation (UI - using this repo)

The UI Extension can be installed manually from the Contentful UI following the below steps:

1. Navigate to Settings > Extensions
2. Click on "Add extension > Install from Github"
3. Use `https://raw.githubusercontent.com/pauloamgomes/contentful-better-slugs/master/extension.json` in the url
4. On the extension settings screen change Hosting to Self-hosted using the url `https://pauloamgomes.github.io/contentful-better-slugs/`

## Usage

1. Add a new text field to your content model, it can be localized.
2. On the Appearance tab ensure that Better Slugs is selected
3. Provide your slug pattern, the pattern can use the following tokens:

- **`[locale]`** - Will replace the token with the node locale
- **`[field:your-field-name]`** - Will replace the token with the value of the field
- **`[field:your-reference-field-name:field-name]`** - Will replace the token with the value of field that belongs to the reference.

Example patterns:

```
[field:title]
```

Thats the default pattern, and probably for most of the cases would be enough.

```
[locale]/[field:category:title]/[field:title]
```

Assuming your locale is English, you have a reference field named category with title value `Computers` and your entry title is `Laptop 15"` the slug will be: `en/computers/laptop-15`

```
[field:date]/[field:title]
```

Assuming your locale is English, you have a date field named date with value `Friday, April 10th 2020` and your entry title is `London Event` the slug will be: `2020-04-10/london-event`

If you have non dynamic strings in the path and you want to localize them, that would be possible (until a max of 3) using the translations fields, for example having a pattern like `/products/[field:name]` and `nl`, `fr` and `de` locales, you can use `products=nl:producten,fr:produits,de:produkte` and `products` will be `produkte` on the slug field for `de` locale.

Other options:

Ability to translate strings from the pattern:

![Screenshot](https://i.snipboard.io/f6td87.jpg)

Option to not update the slug automatically if entry is published, hide the reset button and set the case mode (lowercase, maintain case, title case):

![Screenshot](https://i.snipboard.io/h6f30r.jpg)

## Optional Usage for Development

After cloning, install the dependencies

```bash
yarn install
```

To bundle the extension

```bash
yarn build
```

To host the extension for development on `http://localhost:1234`

```bash
yarn start
```

To install the extension:

```bash
contentful extension update --force
```

## Limitations

Tested only with text and date fields, so not sure how it can behave with custom fields, it will depend on the value stored in the field.

The slug generation is based on the speakingurl library - https://github.com/pid/speakingurl

## Todo

- Improve the handling of reference fields
- Improve the handling of date fields by providing a date format.

## Copyright and license

Copyright 2020 pauloamgomes under the MIT license.
