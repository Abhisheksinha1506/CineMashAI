import { supabaseServer } from '@/lib/supabase-server';
import * as schema from './schema';

// Supabase database wrapper
const db = {
  select: (table: any) => ({
    where: async (conditions: any) => {
      const { data, error } = await supabaseServer
        .from(table.name)
        .select('*')
        .match(conditions);
      if (error) throw error;
      return data || [];
    },
    limit: async (limit: number) => {
      const { data, error } = await supabaseServer
        .from(table.name)
        .select('*')
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    orderBy: async (column: any, direction: 'asc' | 'desc' = 'asc') => {
      const { data, error } = await supabaseServer
        .from(table.name)
        .select('*')
        .order(column, { ascending: direction === 'asc' });
      if (error) throw error;
      return data || [];
    },
    all: async () => {
      const { data, error } = await supabaseServer
        .from(table.name)
        .select('*');
      if (error) throw error;
      return data || [];
    }
  }),
  insert: (table: any) => ({
    values: async (data: any) => {
      const { data: result, error } = await supabaseServer
        .from(table.name)
        .insert(data)
        .select();
      if (error) throw error;
      return result;
    },
    onConflictDoUpdate: (config: any) => async (data: any) => {
      const { data: result, error } = await supabaseServer
        .from(table.name)
        .upsert(data, { onConflict: config.target });
      if (error) throw error;
      return result;
    }
  }),
  update: (table: any) => ({
    set: async (data: any) => ({
      where: async (conditions: any) => {
        const { data: result, error } = await supabaseServer
          .from(table.name)
          .update(data)
          .match(conditions)
          .select();
        if (error) throw error;
        return result;
      }
    })
  }),
  delete: (table: any) => ({
    where: async (conditions: any) => {
      const { error } = await supabaseServer
        .from(table.name)
        .delete()
        .match(conditions);
      if (error) throw error;
    }
  })
};

// Export schema for compatibility
export * from './schema';
export { db };
