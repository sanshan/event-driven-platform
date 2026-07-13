import {describe, expect, it} from 'vitest';

import {DefaultSubjectFactory} from './default-subject-factory.js';

describe('DefaultSubjectFactory', () => {
    const factory = new DefaultSubjectFactory();

    it('creates a Subject from descriptor', () => {
        const subject = factory.create({
            type: 'user',
            id: 'user-1',
        });

        expect(subject).toEqual({
            type: 'user',
            id: 'user-1',
        });
    });

    it('creates a defensive copy of descriptor', () => {
        const descriptor = {
            type: 'tenant',
            id: 'tenant-1',
        };

        const subject = factory.create(descriptor);

        expect(subject).not.toBe(descriptor);
        expect(subject).toEqual(descriptor);
    });

    it('does not change when descriptor changes', () => {
        const descriptor = {
            type: 'user',
            id: 'user-1',
        };

        const subject = factory.create(descriptor);

        descriptor.id = 'user-2';

        expect(subject.id).toBe('user-1');
    });

    it('returns an immutable Subject', () => {
        const subject = factory.create({
            type: 'merchant',
            id: 'merchant-1',
        });

        expect(Object.isFrozen(subject)).toBe(true);
    });

    it.each([
        {
            type: '',
            id: 'user-1',
        },
        {
            type: ' user ',
            id: 'user-1',
        },
        {
            type: 'user',
            id: '',
        },
        {
            type: 'user',
            id: ' user-1 ',
        },
    ])('rejects invalid descriptor %#', (descriptor) => {
        expect(() => factory.create(descriptor)).toThrow();
    });

    it('rejects unknown descriptor fields', () => {
        expect(() => factory.create({
            type: 'user',
            id: 'user-1',
            unexpected: true,
        } as never)).toThrow();
    });
});
