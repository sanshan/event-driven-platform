export interface Subject {
    readonly type: string;
    readonly id: string;
}

export interface SubjectDescriptor {
    readonly type: string;
    readonly id: string;
}

export interface SubjectFactory {
    create(descriptor: SubjectDescriptor): Subject;
}
