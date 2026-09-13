"use client";

import * as React from "react";
import useSWR, { mutate as globalMutate, type Key } from "swr";
import { api, get, post, patch as patchReq, del, qs as buildQs, ApiError } from "@/lib/client/api";
import { toast } from "sonner";

export type ApiMeta = {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type ListResponse<T> = { data: T[]; meta: ApiMeta };

const emptyMeta: ApiMeta = { total: 0, page: 1, perPage: 10, totalPages: 1 };

export type CollectionOptions = {
  /** Endpoint dasar, mis. "/api/residents" */
  path: string;
  /** Query string (tanpa tanda "?"). List akan di-refetch otomatis saat berubah. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Tidak menampilkan toast sukses otomatis (jika komponen menangani sendiri). */
  silent?: boolean;
  /** Jeda fetch (untuk form pencarian) */
  enabled?: boolean;
};

/**
 * Hook koleksi dengan optimistic create / update / delete berbasis SWR.
 * Perubahan langsung terlihat di UI, lalu diganti dengan respons server.
 */
export function useCollection<T extends { id: string }>({
  path,
  query,
  silent = false,
  enabled = true,
}: CollectionOptions) {
  const queryString = React.useMemo(() => buildQs(query ?? {}), [query]);
  const key = React.useMemo(() => (enabled ? `${path}${queryString}` : null), [path, queryString, enabled]) as
    | Key
    | null;

  const swr = useSWR<ListResponse<T>>(key, (url: string) => get<ListResponse<T>>(url), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const { data, mutate, error, isLoading, isValidating } = swr;
  const rows = data?.data ?? [];
  const meta = data?.meta ?? emptyMeta;

  const notify = React.useCallback(
    (message: string) => {
      if (!silent) toast.success(message);
    },
    [silent],
  );

  const create = React.useCallback(
    async (
      input: Partial<T> & Record<string, unknown>,
      optimisticRow?: (tempId: string) => T,
      successMessage = "Data berhasil ditambahkan",
    ) => {
      const tempId = `optimistic-${Date.now()}`;
      const optimistic = (optimisticRow ? optimisticRow(tempId) : ({ ...input, id: tempId } as unknown as T));
      try {
        await mutate(
          async () => {
            await post(path, input);
            return get<ListResponse<T>>(`${path}${queryString}`);
          },
          {
            optimisticData: (current) => ({
              data: [optimistic, ...(current?.data ?? [])],
              meta: current?.meta
                ? { ...current.meta, total: current.meta.total + 1 }
                : { ...emptyMeta, total: 1 },
            }),
            rollbackOnError: true,
            revalidate: true,
            populateCache: true,
          },
        );
        notify(successMessage);
        return true;
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan data");
        return false;
      }
    },
    [mutate, notify, path, queryString],
  );

  const update = React.useCallback(
    async (
      id: string,
      input: Partial<T>,
      successMessage = "Perubahan tersimpan",
      optimisticTransform?: (row: T) => T,
    ) => {
      try {
        await mutate(
          async () => {
            await patchReq(`${path}/${id}`, input);
            return get<ListResponse<T>>(`${path}${queryString}`);
          },
          {
            optimisticData: (current) => ({
              data: (current?.data ?? []).map((row) =>
                row.id === id ? (optimisticTransform ? optimisticTransform(row) : { ...row, ...input }) : row,
              ),
              meta: current?.meta ?? emptyMeta,
            }),
            rollbackOnError: true,
            revalidate: true,
            populateCache: true,
          },
        );
        notify(successMessage);
        return true;
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan perubahan");
        return false;
      }
    },
    [mutate, notify, path, queryString],
  );

  const remove = React.useCallback(
    async (id: string, successMessage = "Data berhasil dihapus") => {
      try {
        await mutate(
          async () => {
            await del(`${path}/${id}`);
            return get<ListResponse<T>>(`${path}${queryString}`);
          },
          {
            optimisticData: (current) => ({
              data: (current?.data ?? []).filter((row) => row.id !== id),
              meta: current?.meta
                ? { ...current.meta, total: Math.max(0, current.meta.total - 1) }
                : emptyMeta,
            }),
            rollbackOnError: true,
            revalidate: true,
            populateCache: true,
          },
        );
        notify(successMessage);
        return true;
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal menghapus data");
        return false;
      }
    },
    [mutate, notify, path, queryString],
  );

  /* Aksi khusus (POST ke sub-path) dengan optimistic update opsional */
  const action = React.useCallback(
    async (
      url: string,
      body?: unknown,
      options?: {
        successMessage?: string;
        optimistic?: (current: ListResponse<T>) => ListResponse<T>;
        revalidateKeys?: string[];
      },
    ) => {
      try {
        await mutate(
          async () => {
            await api(url, { method: "POST", body: JSON.stringify(body ?? {}) });
            const fresh = await get<ListResponse<T>>(`${path}${queryString}`);
            if (options?.revalidateKeys) {
              options.revalidateKeys.forEach((k) => globalMutate(k));
            }
            return fresh;
          },
          options?.optimistic
            ? {
                optimisticData: (current) => options.optimistic!(current ?? { data: [], meta: emptyMeta }),
                rollbackOnError: true,
                revalidate: true,
                populateCache: true,
              }
            : { revalidate: true, populateCache: true },
        );
        toast.success(options?.successMessage ?? "Aksi berhasil dijalankan");
        return true;
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Aksi gagal dijalankan");
        return false;
      }
    },
    [mutate, path, queryString],
  );

  return {
    rows,
    meta,
    error: error as Error | undefined,
    isLoading: isLoading && !data,
    isValidating,
    refresh: () => mutate(),
    mutate,
    create,
    update,
    remove,
    action,
  };
}

/** Hook untuk satu resource (detail). */
export function useResource<T>(path: string | null) {
  const swr = useSWR<T>(path, (url: string) => get<T>(url), { revalidateOnFocus: false });
  return {
    data: swr.data,
    error: swr.error as Error | undefined,
    isLoading: swr.isLoading,
    refresh: swr.mutate,
  };
}
