import dotenv from 'dotenv';

dotenv.config();

export async function getMovieFromTmdb(tmdb_id: string) {
    try {
        const url = `https://api.themoviedb.org/3/movie/${tmdb_id}`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
                Accept: 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.statusText}`);
        }
        const data = await response.json();
        if (new Date(data.release_date).getTime() > new Date().getTime()) {
            return new Error("Media not released yet");
        }
        let info = {
            type: "movie",
            title: data.original_title,
            releaseYear: data.release_date ? Number(data.release_date.split("-")[0]) : null,
            tmdbId: tmdb_id,
            imdbId: data.imdb_id
        };
        return info;
    } catch (e: any) {
        return new Error("An error occurred: " + e.message);
    }
}
export async function getTvFromTmdb(tmdb_id: string, season: string, episode: string) {
    try {
        const url = `https://api.themoviedb.org/3/tv/${tmdb_id}/season/${season}/episode/${episode}?append_to_response=external_ids`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
                Accept: 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.statusText}`);
        }
        const data = await response.json();
        if (new Date(data.air_date).getTime() > new Date().getTime()) {
            return new Error("Not released yet");
        }
        let secondData: any = await fetch(`https://api.themoviedb.org/3/tv/${tmdb_id}`, {
            headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
                Accept: 'application/json'
            }
        });
        secondData = await secondData.json();
        let info = {
            type: "tv",
            title: secondData.name || "Unknown Title",
            releaseYear: data.air_date ? data.air_date.split("-")[0] : null,
            tmdbId: tmdb_id,
            imdbId: data.external_ids?.imdb_id || null,
            season: season,
            episode: episode,
            episodeName: data.name || "Unknown Episode"
        };
        return info;
    } catch (e: any) {
        return new Error("An error occurred: " + e.message);
    }
}