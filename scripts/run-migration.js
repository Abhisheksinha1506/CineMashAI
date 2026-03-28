const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Adding source_movies column to fusions table...');
    
    // Add the source_movies column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE fusions ADD COLUMN IF NOT EXISTS source_movies JSONB;'
    });
    
    if (alterError) {
      console.error('Error adding column:', alterError);
      // Try alternative approach
      console.log('Trying alternative approach...');
      
      // Check if column exists first
      const { data: columns, error: checkError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'fusions')
        .eq('column_name', 'source_movies');
      
      if (checkError) {
        console.error('Error checking column:', checkError);
        return;
      }
      
      if (!columns || columns.length === 0) {
        console.log('Column does not exist, adding it...');
        // This might not work with Supabase client, but let's try
        console.log('Please run the migration manually in Supabase dashboard:');
        console.log('ALTER TABLE fusions ADD COLUMN source_movies JSONB;');
        console.log('CREATE INDEX idx_fusions_source_movies ON fusions USING GIN (source_movies);');
      } else {
        console.log('Column already exists');
      }
    } else {
      console.log('Column added successfully');
      
      // Add index
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql: 'CREATE INDEX IF NOT EXISTS idx_fusions_source_movies ON fusions USING GIN (source_movies);'
      });
      
      if (indexError) {
        console.error('Error adding index:', indexError);
        console.log('Please manually add the index: CREATE INDEX IF NOT EXISTS idx_fusions_source_movies ON fusions USING GIN (source_movies);');
      } else {
        console.log('Index added successfully');
      }
    }
    
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
