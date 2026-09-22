import { activeSlots, isFull, toggleSlot } from './slots';

describe('toggleSlot', () => {
  it('adds to the first free slot and removes in place', () => {
    let slots = toggleSlot<string>([], 'Chest');
    slots = toggleSlot(slots, 'Lats');
    slots = toggleSlot(slots, 'Quads');
    expect(slots).toEqual(['Chest', 'Lats', 'Quads']);

    // Removing the middle one must not move Quads onto another color.
    slots = toggleSlot(slots, 'Lats');
    expect(slots).toEqual(['Chest', null, 'Quads']);
    expect(activeSlots(slots)).toEqual(['Chest', 'Quads']);

    slots = toggleSlot(slots, 'Glutes');
    expect(slots).toEqual(['Chest', 'Glutes', 'Quads']);
  });

  it('drops trailing holes so an empty selection is empty', () => {
    const slots = toggleSlot(toggleSlot<string>([], 'Chest'), 'Chest');
    expect(slots).toEqual([]);
  });

  it('refuses to exceed the cap', () => {
    const full = ['a', 'b', 'c'];
    expect(toggleSlot(full, 'd', 3)).toBe(full);
    expect(isFull(full, 3)).toBe(true);
    expect(toggleSlot(full, 'b', 3)).toEqual(['a', null, 'c']);
  });
});
