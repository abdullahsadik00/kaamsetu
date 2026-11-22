import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { setupI18n } from '@/testing/render';

import { ConfirmDialog, FilterChips, HeaderMore } from './parts';

beforeAll(setupI18n);

describe('FilterChips (BUG-05)', () => {
  it('renders compact pills that do not grow to fill the screen, and switches', async () => {
    const onChange = jest.fn();
    await render(
      <FilterChips
        label="Show"
        options={[
          { value: 'today', label: 'Today' },
          { value: 'done', label: 'Completed' },
        ]}
        value="today"
        onChange={onChange}
      />,
    );
    const row = screen.getByLabelText('Show');
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({ flexGrow: 0 });
    const chip = screen.getByRole('radio', { name: 'Completed' });
    expect(StyleSheet.flatten(chip.props.style)).toMatchObject({ height: 36 });
    expect(screen.getByRole('radio', { name: 'Today' }).props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(chip);
    expect(onChange).toHaveBeenCalledWith('done');
  });
});

describe('HeaderMore (BUG-08)', () => {
  it('is one ⋮ icon named "More", with no visible "More" word', async () => {
    const onPress = jest.fn();
    await render(<HeaderMore label="More" onPress={onPress} />);
    expect(screen.queryByText('More')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'More' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ConfirmDialog (BUG-09)', () => {
  it('splits Keep and Cancel 50/50 across the row', async () => {
    await render(
      <ConfirmDialog
        visible
        title="Cancel job #12?"
        body="The team is told."
        keepLabel="Keep job"
        confirmLabel="Cancel job"
        onKeep={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    for (const name of ['Keep job', 'Cancel job']) {
      expect(StyleSheet.flatten(screen.getByRole('button', { name }).props.style)).toMatchObject({ flex: 1 });
    }
  });
});
