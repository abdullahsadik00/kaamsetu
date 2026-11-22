import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { setupI18n } from '@/testing/render';

import { FilterChips, HeaderMore } from './parts';

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
