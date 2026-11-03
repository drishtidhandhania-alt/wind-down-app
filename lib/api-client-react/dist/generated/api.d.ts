import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { HealthStatus, PauseChoiceInput, PauseChoiceResult, RoutineCompleteInput, RoutineCompleteResult, ShortcutDecision, TesterCreateInput, TesterCreated, TesterSettingsInput, TesterState } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateWindDownTesterUrl: () => string;
/**
 * @summary Create a private tester and token
 */
export declare const createWindDownTester: (testerCreateInput: TesterCreateInput, options?: Parameters<typeof customFetch>[1]) => Promise<TesterCreated>;
export declare const getCreateWindDownTesterMutationKey: () => readonly ["createWindDownTester"];
export declare const getCreateWindDownTesterMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWindDownTester>>, TError, CreateWindDownTesterMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createWindDownTester>>, TError, CreateWindDownTesterMutationVariables, TContext>;
export type CreateWindDownTesterMutationResult = NonNullable<Awaited<ReturnType<typeof createWindDownTester>>>;
export type CreateWindDownTesterMutationBody = BodyType<TesterCreateInput>;
export type CreateWindDownTesterMutationError = ErrorType<void>;
export type CreateWindDownTesterMutationVariables = {
    data: BodyType<TesterCreateInput>;
};
/**
* @summary Create a private tester and token
*/
export declare const useCreateWindDownTester: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWindDownTester>>, TError, CreateWindDownTesterMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createWindDownTester>>, TError, CreateWindDownTesterMutationVariables, TContext>;
export declare const getGetWindDownTesterUrl: () => string;
/**
 * @summary Read current tester settings and status
 */
export declare const getWindDownTester: (options?: Parameters<typeof customFetch>[1]) => Promise<TesterState>;
export declare const getGetWindDownTesterQueryKey: () => readonly ["/api/wind-down/me"];
export declare const getGetWindDownTesterQueryOptions: <TData = Awaited<ReturnType<typeof getWindDownTester>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWindDownTester>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWindDownTester>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWindDownTesterQueryResult = NonNullable<Awaited<ReturnType<typeof getWindDownTester>>>;
export type GetWindDownTesterQueryError = ErrorType<void>;
/**
 * @summary Read current tester settings and status
 */
export declare function useGetWindDownTester<TData = Awaited<ReturnType<typeof getWindDownTester>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWindDownTester>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateWindDownSettingsUrl: () => string;
/**
 * @summary Update bedtime, morning end, timezone, or test mode
 */
export declare const updateWindDownSettings: (testerSettingsInput: TesterSettingsInput, options?: Parameters<typeof customFetch>[1]) => Promise<TesterState>;
export declare const getUpdateWindDownSettingsMutationKey: () => readonly ["updateWindDownSettings"];
export declare const getUpdateWindDownSettingsMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateWindDownSettings>>, TError, UpdateWindDownSettingsMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateWindDownSettings>>, TError, UpdateWindDownSettingsMutationVariables, TContext>;
export type UpdateWindDownSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateWindDownSettings>>>;
export type UpdateWindDownSettingsMutationBody = BodyType<TesterSettingsInput>;
export type UpdateWindDownSettingsMutationError = ErrorType<void>;
export type UpdateWindDownSettingsMutationVariables = {
    data: BodyType<TesterSettingsInput>;
};
/**
* @summary Update bedtime, morning end, timezone, or test mode
*/
export declare const useUpdateWindDownSettings: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateWindDownSettings>>, TError, UpdateWindDownSettingsMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateWindDownSettings>>, TError, UpdateWindDownSettingsMutationVariables, TContext>;
export declare const getCheckWindDownUrl: () => string;
/**
 * Records the app-open event. Call from the personal iPhone Shortcut.
 * @summary Check whether an Instagram open should pause
 */
export declare const checkWindDown: (options?: Parameters<typeof customFetch>[1]) => Promise<ShortcutDecision>;
export declare const getCheckWindDownMutationKey: () => readonly ["checkWindDown"];
export declare const getCheckWindDownMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof checkWindDown>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof checkWindDown>>, TError, void, TContext>;
export type CheckWindDownMutationResult = NonNullable<Awaited<ReturnType<typeof checkWindDown>>>;
export type CheckWindDownMutationError = ErrorType<void>;
/**
* @summary Check whether an Instagram open should pause
*/
export declare const useCheckWindDown: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof checkWindDown>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof checkWindDown>>, TError, void, TContext>;
export declare const getSaveWindDownPauseChoiceUrl: () => string;
/**
 * @summary Save a pause choice and optionally start a 10-minute bypass
 */
export declare const saveWindDownPauseChoice: (pauseChoiceInput: PauseChoiceInput, options?: Parameters<typeof customFetch>[1]) => Promise<PauseChoiceResult>;
export declare const getSaveWindDownPauseChoiceMutationKey: () => readonly ["saveWindDownPauseChoice"];
export declare const getSaveWindDownPauseChoiceMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveWindDownPauseChoice>>, TError, SaveWindDownPauseChoiceMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof saveWindDownPauseChoice>>, TError, SaveWindDownPauseChoiceMutationVariables, TContext>;
export type SaveWindDownPauseChoiceMutationResult = NonNullable<Awaited<ReturnType<typeof saveWindDownPauseChoice>>>;
export type SaveWindDownPauseChoiceMutationBody = BodyType<PauseChoiceInput>;
export type SaveWindDownPauseChoiceMutationError = ErrorType<void>;
export type SaveWindDownPauseChoiceMutationVariables = {
    data: BodyType<PauseChoiceInput>;
};
/**
* @summary Save a pause choice and optionally start a 10-minute bypass
*/
export declare const useSaveWindDownPauseChoice: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveWindDownPauseChoice>>, TError, SaveWindDownPauseChoiceMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof saveWindDownPauseChoice>>, TError, SaveWindDownPauseChoiceMutationVariables, TContext>;
export declare const getCompleteWindDownRoutineUrl: () => string;
/**
 * @summary Record explicit completion of the bedtime routine
 */
export declare const completeWindDownRoutine: (routineCompleteInput: RoutineCompleteInput, options?: Parameters<typeof customFetch>[1]) => Promise<RoutineCompleteResult>;
export declare const getCompleteWindDownRoutineMutationKey: () => readonly ["completeWindDownRoutine"];
export declare const getCompleteWindDownRoutineMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeWindDownRoutine>>, TError, CompleteWindDownRoutineMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completeWindDownRoutine>>, TError, CompleteWindDownRoutineMutationVariables, TContext>;
export type CompleteWindDownRoutineMutationResult = NonNullable<Awaited<ReturnType<typeof completeWindDownRoutine>>>;
export type CompleteWindDownRoutineMutationBody = BodyType<RoutineCompleteInput>;
export type CompleteWindDownRoutineMutationError = ErrorType<void>;
export type CompleteWindDownRoutineMutationVariables = {
    data: BodyType<RoutineCompleteInput>;
};
/**
* @summary Record explicit completion of the bedtime routine
*/
export declare const useCompleteWindDownRoutine: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeWindDownRoutine>>, TError, CompleteWindDownRoutineMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completeWindDownRoutine>>, TError, CompleteWindDownRoutineMutationVariables, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map