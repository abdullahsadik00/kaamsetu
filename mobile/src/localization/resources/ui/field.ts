/**
 * Extra strings for the Stitch UI update (field screens). Each language must
 * have exactly the keys of `en` (checked below). Wired into en/hi/mr.ts as
 * `uiField`; use them as t('uiField.someKey').
 */
const en = {
  _: '',
};

type Keys = { [K in keyof typeof en]: string };

const hi: Keys = {
  _: '',
};

const mr: Keys = {
  _: '',
};

export const fieldUi = { en, hi, mr };
