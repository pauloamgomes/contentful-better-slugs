/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useState, useRef, useEffect } from 'react';
import { render } from 'react-dom';
import { init, FieldExtensionSDK } from 'contentful-ui-extensions-sdk';
import getSlug from 'speakingurl';
//==
import './index.css';

interface BetterSlugsProps {
  sdk: FieldExtensionSDK;
}

const languages: any = {
  ar: 'ar',
  az: 'az',
  cs: 'cs',
  de: 'de',
  dv: 'dv',
  en: 'en',
  es: 'es',
  fa: 'fa',
  fi: 'fi',
  fr: 'fr',
  ge: 'ge',
  gr: 'gr',
  hu: 'hu',
  it: 'it',
  lt: 'lt',
  lv: 'lv',
  my: 'my',
  mk: 'mk',
  nl: 'nl',
  pl: 'pl',
  pt: 'pt',
  ro: 'ro',
  ru: 'ru',
  sk: 'sk',
  sr: 'sr',
  tr: 'tr',
  uk: 'uk',
  vn: 'vn',
};

const BetterSlugs = ({ sdk }: BetterSlugsProps) => {
  const debounceInterval: any = useRef(false);
  const detachExternalChangeHandler: any = useRef(null);
  const parameters: any = sdk.parameters;
  const pattern: string = parameters.instance.pattern || '';
  const displayDefaultLocale: boolean = parameters.instance.displayDefaultLocale;
  const lockWhenPublished: boolean = parameters.instance.lockWhenPublished;
  const translations1: string = parameters.instance.translations1 || '';
  const translations2: string = parameters.instance.translations2 || '';
  const translations3: string = parameters.instance.translations3 || '';
  const hideReset: boolean = parameters.instance.hideReset || false;
  const caseOption: string = parameters.instance.caseOption;
  const slugOptions: any = {};
  if (caseOption) {
    slugOptions[caseOption] = true;
  }

  const parts = pattern.split('/').map((part: string) => part.replace(/(\[|\])/gi, '').trim());

  const [value, setValue] = useState('');
  const fields: string[] = [];

  useEffect(() => {
    sdk.window.startAutoResizer();

    // Extract fields used in slug parts.
    parts.forEach((part: string) => {
      if (part.startsWith('field:')) {
        fields.push(part.replace('field:', ''));
      }
    });

    // Create a listener for each field and matching locales.
    fields.forEach((field: string) => {
      const fieldParts = field.split(':');
      const fieldName = fieldParts.length === 1 ? field : fieldParts[0];
      if (Object.prototype.hasOwnProperty.call(sdk.entry.fields, fieldName)) {
        const locales = sdk.entry.fields[fieldName].locales;

        locales.forEach((locale: string) => {
          sdk.entry.fields[fieldName].onValueChanged(locale, () => {
            if (debounceInterval.current) {
              clearInterval(debounceInterval.current);
            }
            debounceInterval.current = setTimeout(() => {
              updateSlug(locale);
            }, 500);
          });
        });
      }
    });

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    if (sdk.field) {
      detachExternalChangeHandler.current = sdk.field.onValueChanged(onExternalChange);
    }

    return () => {
      if (detachExternalChangeHandler.current) {
        detachExternalChangeHandler.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Retrieves the raw value from a referenced field.
   */
  const getReferenceFieldValue = async (
    fieldName: string,
    subFieldName: string,
    locale: string
  ) => {
    const defaultLocale = sdk.locales.default;
    const referenceLocale = sdk.entry.fields[fieldName].locales.includes(locale)
      ? locale
      : defaultLocale;

    const reference = sdk.entry.fields[fieldName].getValue(referenceLocale);
    if (!reference || !reference.sys || !reference.sys.id) {
      return '';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await sdk.space.getEntry(reference.sys.id);
    const { fields } = result;

    if (!fields) {
      return '';
    }

    if (!Object.prototype.hasOwnProperty.call(fields, subFieldName)) {
      return '';
    }

    if (Object.prototype.hasOwnProperty.call(fields[subFieldName], locale)) {
      return fields[subFieldName][locale];
    }

    if (Object.prototype.hasOwnProperty.call(fields[subFieldName], defaultLocale)) {
      return fields[subFieldName][defaultLocale];
    }

    return '';
  };

  const isLocked = () => {
    const sys: any = sdk.entry.getSys();

    const published = !!sys.publishedVersion && sys.version == sys.publishedVersion + 1;
    const changed = !!sys.publishedVersion && sys.version >= sys.publishedVersion + 2;

    return published || changed;
  };

  const translatePart = (part: string, locale: string) => {
    const regex = new RegExp(`^${part}=`);
    let translationConfig = '';
    let translation = '';

    if (regex.test(translations1)) {
      translationConfig = translations1;
    } else if (regex.test(translations2)) {
      translationConfig = translations2;
    } else if (regex.test(translations3)) {
      translationConfig = translations3;
    }

    translationConfig
      .replace(`${part}=`, '')
      .split(',')
      .find((val) => {
        const [transKey, transValue] = val.split(':');
        if (transKey === locale) {
          translation = transValue;
          return true;
        }
      });

    return translation || part;
  };

  const partIsTranslatable = (part: string) => {
    const regex = new RegExp(`^${part}=`);
    return regex.test(translations1) || regex.test(translations2) || regex.test(translations3);
  };

  /**
   * Updates the slug based on the defined pattern.
   */
  const updateSlug = async (locale: string, force = false) => {
    if (sdk.field.locale !== locale || (!force && lockWhenPublished && isLocked())) {
      return;
    }

    const defaultLocale = sdk.locales.default;
    const slugParts: string[] = [];

    for (const part of parts) {
      if (part.startsWith('field:')) {
        const fieldParts = part.split(':');
        let raw = '';
        let slug = '';

        const lang: string = languages[locale.slice(0, 2).toLowerCase()] || 'en';

        if (fieldParts.length === 2) {
          if (sdk.entry.fields[fieldParts[1]] !== undefined) {
            if (sdk.entry.fields[fieldParts[1]].locales.includes(locale)) {
              raw = sdk.entry.fields[fieldParts[1]].getValue(locale);
            } else {
              raw = sdk.entry.fields[fieldParts[1]].getValue(defaultLocale);
            }
          }
          // eslint-disable-next-line no-misleading-character-class
          slug = getSlug(raw, { ...slugOptions, lang }).replace(/[-\ufe0f]+$/gu, '');
        } else {
          raw = (await getReferenceFieldValue(fieldParts[1], fieldParts[2], locale)) || '';
          slug = getSlug(raw, { ...slugOptions, lang, custom: { '/': '/' } })
            // eslint-disable-next-line no-misleading-character-class
            .replace(/[-\ufe0f]+$/gu, '');
        }

        slugParts.push(slug);
      } else if (part === 'locale') {
        if (locale !== defaultLocale || (locale === defaultLocale && displayDefaultLocale)) {
          slugParts.push(locale);
        }
      } else if (partIsTranslatable(part)) {
        slugParts.push(translatePart(part, locale));
      } else {
        slugParts.push(part);
      }
    }

    sdk.entry.fields[sdk.field.id].setValue(
      slugParts.join('/').replace('//', '/').replace(/\/$/, ''),
      locale
    );
  };

  const onExternalChange = (value: string) => {
    setValue(value);
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;

    setValue(value);

    if (value) {
      await sdk.field.setValue(value);
    } else {
      await sdk.field.removeValue();
    }
  };

  return (
    <div className="container">
      <input width="large" id="slug-field" name="slug" value={value || ''} onChange={onChange} />
      {!hideReset ? (
        <button onClick={() => updateSlug(sdk.field.locale, true)}>reset</button>
      ) : null}
    </div>
  );
};

init((sdk) => {
  render(<BetterSlugs sdk={sdk as FieldExtensionSDK} />, document.getElementById('root'));
});
