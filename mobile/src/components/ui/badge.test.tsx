import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { setupI18n } from '@/testing/render';

import { Badge } from './badge';

beforeAll(setupI18n);

describe('Badge (BUG-11)', () => {
  it('stays one line and does not shrink below its text', async () => {
    await render(<Badge label="Job made" tone="ok" />);
    const text = screen.getByText('Job made');
    expect(text.props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(text.parent?.props.style)).toMatchObject({ flexShrink: 0, alignSelf: 'flex-start' });
  });
});
