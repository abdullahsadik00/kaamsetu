/* eslint-env jest */
// Native modules that jest-expo does not mock.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
