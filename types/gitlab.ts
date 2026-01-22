import {
  ExpandedMergeRequestSchema,
  MergeRequestDiffSchema,
} from "@gitbeaker/rest";

type CamelizeString<T extends PropertyKey> = T extends string ? string extends T ? string : T extends `${infer F}_${infer R}` ? `${F}${Capitalize<CamelizeString<R>>}` : T : T;

export type DeepCamelize<T> = T extends readonly (infer U)[]
  ? DeepCamelize<U>[]
  : T extends object
  ? {
    [K in keyof T as CamelizeString<K>]: DeepCamelize<T[K]>;
  }
  : T;

/**
 * Merge Request 变更（包含 diff 信息）
 * GitLab API 返回的类型（已启用 camelize）
 */
export type MergeRequestChanges = DeepCamelize<ExpandedMergeRequestSchema & {
  changes: MergeRequestDiffSchema[];
}>;