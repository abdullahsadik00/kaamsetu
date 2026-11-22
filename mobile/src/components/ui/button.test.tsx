import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { setupI18n } from '@/testing/render';
import { colors, touch } from '@/theme/tokens';

import { Button, ButtonRow } from './button';

beforeAll(setupI18n);

const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

describe('Button (BUG-06, BUG-07)', () => {
  it('primary is solid teal, secondary is a teal outline, both a fixed height with a one-line label', async () => {
    await render(
      <>
        <Button label="Create job & assign" onPress={jest.fn()} />
        <Button variant="secondary" icon="phone-outline" label="Call team" onPress={jest.fn()} />
      </>,
    );
    expect(styleOf('Create job & assign')).toMatchObject({ height: touch.min, backgroundColor: colors.teal });
    expect(styleOf('Call team')).toMatchObject({ height: touch.min, borderColor: colors.teal, borderWidth: 1.5 });
    expect(screen.getByText('Call team').props.numberOfLines).toBe(1);
  });

  it('while loading it is disabled and shows what is happening beside a spinner', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save job" loadingLabel="Saving job…" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Saving job…' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ButtonRow (BUG-09)', () => {
  it('gives each button an equal share of the row', async () => {
    await render(
      <ButtonRow>
        <Button variant="secondary" label="Cancel" onPress={jest.fn()} />
        <Button variant="destructive" label="Remove" onPress={jest.fn()} />
        {null}
      </ButtonRow>,
    );
    for (const name of ['Cancel', 'Remove']) {
      const cell = screen.getByRole('button', { name }).parent;
      expect(StyleSheet.flatten(cell?.props.style)).toMatchObject({ flex: 1 });
    }
  });
});
