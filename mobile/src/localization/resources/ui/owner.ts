/**
 * Extra strings for the Stitch UI update (owner screens). Each language must
 * have exactly the keys of `en` (checked below). Wired into en/hi/mr.ts as
 * `uiOwner`; use them as t('uiOwner.someKey').
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

export const ownerUi = { en, hi, mr };
