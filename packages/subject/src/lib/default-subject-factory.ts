import type { Subject, SubjectDescriptor, SubjectFactory } from './subject.js';
import { subjectDescriptorSchema } from './subject-descriptor-schema.js';

export class DefaultSubjectFactory implements SubjectFactory {
    create(descriptor: SubjectDescriptor): Subject {
        const parsed = subjectDescriptorSchema.parse(descriptor);

        return Object.freeze({
            ...parsed,
        });
    }
}
