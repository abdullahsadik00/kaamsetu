/**
 * Extra strings for the Stitch UI update (people screens). Each language must
 * have exactly the keys of `en` (checked below). Wired into en/hi/mr.ts as
 * `uiPeople`; use them as t('uiPeople.someKey').
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

export const peopleUi = { en, hi, mr };
