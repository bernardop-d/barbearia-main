const base = require('./app.json').expo

module.exports = {
  expo: {
    ...base,
    extra: {
      ...base.extra,
      supabaseUrl:     process.env.SUPABASE_URL     || 'https://phhvzajbomoyedbwebgl.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaHZ6YWpib21veWVkYndlYmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMwMDAsImV4cCI6MjA4OTQ0OTAwMH0.ZW72jJcFcgiDnH76ZdqWt-bFcDNNM1eYbr344h6yvpA',
    },
  },
}
