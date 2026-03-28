import { NextRequest, NextResponse } from 'next/server';
import { searchMoviesHybrid } from '@/lib/movie-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1');

  if (!query) {
    return NextResponse.json({ results: [], page: 1, total_pages: 0 });
  }

  try {
    const data = await searchMoviesHybrid(query, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Failed to search movies' },
      { status: 500 }
    );
  }
}
