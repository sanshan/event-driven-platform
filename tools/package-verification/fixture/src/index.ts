import { DefaultActorFactory } from '@event-driven-platform/actor';
import { DefaultAggregateReferenceFactory } from '@event-driven-platform/aggregate-reference';
import { DefaultEventIdFactory, type Event } from '@event-driven-platform/event';
import { DefaultIntentFactory } from '@event-driven-platform/intent';
import { type Operation, type OperationResultOf } from '@event-driven-platform/operation';
import { OperationResults } from '@event-driven-platform/operation-result';
import { DefaultSubjectFactory } from '@event-driven-platform/subject';
import { DefaultTenantReferenceFactory } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

type TenantId = Brand<string, 'TenantId'>;
type AccountId = Brand<string, 'AccountId'>;

const tenant = new DefaultTenantReferenceFactory().create({
    type: 'tenant',
    id: 'tenant-1' as TenantId,
});

const aggregate = new DefaultAggregateReferenceFactory().create({
    type: 'account',
    id: 'account-1' as AccountId,
});

const actor = new DefaultActorFactory().create({
    type: 'service',
    id: 'package-verification',
});

const subject = new DefaultSubjectFactory().create({
    type: 'account',
    id: 'account-1',
});

const intent = new DefaultIntentFactory().create({
    namespace: 'package-verification',
    action: 'verify',
    version: 1,
    tenant,
    components: {
        aggregateId: aggregate.id,
    },
});

const eventId = new DefaultEventIdFactory().create({
    intentId: intent.id,
    eventIndex: 0,
    eventName: 'PackageVerificationCompleted',
    schemaVersion: 1,
});

const event: Event<'PackageVerificationCompleted', 1, { readonly eventId: string }> = {
    name: 'PackageVerificationCompleted',
    schemaVersion: 1,
    payload: {
        eventId,
    },
};

const result = OperationResults.success({
    data: {
        verified: true,
    },
    events: [event],
});

type VerificationOperation = Operation<
    'VerifyPackedPackages',
    1,
    typeof tenant,
    typeof aggregate,
    { readonly source: 'packed-artifacts' },
    typeof result
>;

const operation: VerificationOperation = {
    name: 'VerifyPackedPackages',
    schemaVersion: 1,
    intent,
    actor,
    tenant,
    subject,
    aggregate,
    payload: {
        source: 'packed-artifacts',
    },
};

const inferredResult: OperationResultOf<VerificationOperation> = result;

if (
    operation.intent.id.length === 0 ||
    eventId.length === 0 ||
    inferredResult.status !== 'success' ||
    inferredResult.data.verified !== true
) {
    throw new Error('Packed package verification failed.');
}
