import * as React from 'react';
import { render } from 'react-dom';
import { init, FieldExtensionSDK } from 'contentful-ui-extensions-sdk';
import slugify from 'react-slugify';
//==
import './index.css';

interface BetterSlugsProps {
  sdk: FieldExtensionSDK;
}

const BetterSlugs = ({ sdk }: BetterSlugsProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let debounceInterval: any = false;
  let detachExternalChangeHandler: Function | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parameters:any = sdk.parameters;
  const pattern: string = parameters.instance.pattern || '';
  const displayDefaultLocale: boolean = parameters.instance.displayDefaultLocale;
  const lockWhenPublished: boolean = parameters.instance.lockWhenPublished;
  const translations1:string = parameters.instance.translations1 || ''
  const translations2:string = parameters.instance.translations2 || ''
  const translations3:string = parameters.instance.translations3 || ''
  const hideReset:boolean = parameters.instance.hideReset || false

  const parts = pattern.split('/').map((part: string) => part.replace(/(\[|\])/gi, '').trim());

  const [value, setValue] = React.useState('');
  const fields: string[] = [];

  React.useEffect(() => {
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
            if (debounceInterval) {
              clearInterval(debounceInterval);
            }
            debounceInterval = setTimeout(() => {
              updateSlug(locale);
            }, 500);
          });
        });
      }
    });

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    if (sdk.field) {
      detachExternalChangeHandler = sdk.field.onValueChanged(onExternalChange);
    }

    return () => {
      if (detachExternalChangeHandler) {
        detachExternalChangeHandler();
      }
    };
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

  const translatePart = (part:string, locale:string) => {
    const regex = new RegExp(`^${part}=`)
    let translationConfig = ''
    let translation = ''

    if (regex.test(translations1)) {
      translationConfig = translations1
    } else if (regex.test(translations2)) {
      translationConfig = translations2
    } else if (regex.test(translations3)) {
      translationConfig = translations3
    }

    translationConfig.replace(`${part}=`, '').split(',').find((val) => {
      const [transKey, transValue] = val.split(':')
      if (transKey === locale) {
        translation = transValue
        return true
      }
    })

    return translation || part
  }

  const partIsTranslatable = (part:string) => {
    const regex = new RegExp(`^${part}=`)
    return (regex.test(translations1) || regex.test(translations2) || regex.test(translations3))
  }

  /**
   * Updates the slug based on the defined pattern.
   */
  const updateSlug = async (locale: string, force = false) => {
    if (!force && lockWhenPublished && isLocked() && sdk.field.getValue()) {
      return;
    }

    const defaultLocale = sdk.locales.default;
    const slugParts: string[] = [];

    for (const part of parts) {
      if (part.startsWith('field:')) {
        const fieldParts = part.split(':');
        let raw = '';

        if (fieldParts.length === 2) {
          if (sdk.entry.fields[fieldParts[1]] !== undefined) {
            if (sdk.entry.fields[fieldParts[1]].locales.includes(locale)) {
              raw = sdk.entry.fields[fieldParts[1]].getValue(locale);
            } else {
              raw = sdk.entry.fields[fieldParts[1]].getValue(defaultLocale);
            }
          }
        } else {
          raw = await getReferenceFieldValue(fieldParts[1], fieldParts[2], locale);
        }

        // eslint-disable-next-line no-misleading-character-class
        const slug = slugify(raw).replace(/[-\ufe0f]+$/gu, '');

        slugParts.push(slug);
      } else if (part === 'locale') {
        if (locale !== defaultLocale || (locale === defaultLocale && displayDefaultLocale)) {
          slugParts.push(locale);
        }
      } else if (partIsTranslatable(part)) {
        slugParts.push(translatePart(part, locale))
      } else {
        slugParts.push(part);
      }
    }

    sdk.entry.fields[sdk.field.id].setValue(
      slugParts
        .join('/')
        .replace('//', '/')
        .replace(/\/$/, ''),
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
      {!hideReset ? <button onClick={() => updateSlug(sdk.field.locale, true)}>reset</button>: null}
    </div>
  );
};

init(sdk => {
  render(<BetterSlugs sdk={sdk as FieldExtensionSDK} />, document.getElementById('root'));
});
