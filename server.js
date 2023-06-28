const http = require('http');
const fs = require('fs');
const { features } = require('process');
const { url } = require('inspector');

/* ============================ SERVER DATA ============================ */
let artists = JSON.parse(fs.readFileSync('./seeds/artists.json'));
let albums = JSON.parse(fs.readFileSync('./seeds/albums.json'));
let songs = JSON.parse(fs.readFileSync('./seeds/songs.json'));

let nextArtistId = 2;
let nextAlbumId = 2;
let nextSongId = 2;

// returns an artistId for a new artist
function getNewArtistId() {
  const newArtistId = nextArtistId;
  nextArtistId++;
  return newArtistId;
}

// returns an albumId for a new album
function getNewAlbumId() {
  const newAlbumId = nextAlbumId;
  nextAlbumId++;
  return newAlbumId;
}

// returns an songId for a new song
function getNewSongId() {
  const newSongId = nextSongId;
  nextSongId++;
  return newSongId;
}

/* ======================= PROCESS SERVER REQUESTS ======================= */
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // assemble the request body
  let reqBody = "";
  req.on("data", (data) => {
    reqBody += data;
  });

  req.on("end", () => { // finished assembling the entire request body
    // Parsing the body of the request depending on the "Content-Type" header
    if (reqBody) {
      switch (req.headers['content-type']) {
        case "application/json":
          req.body = JSON.parse(reqBody);
          break;
        case "application/x-www-form-urlencoded":
          req.body = reqBody
            .split("&")
            .map((keyValuePair) => keyValuePair.split("="))
            .map(([key, value]) => [key, value.replace(/\+/g, " ")])
            .map(([key, value]) => [key, decodeURIComponent(value)])
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {});
          break;
        default:
          break;
      }
      console.log(req.body);
    }

    /* ========================== ROUTE HANDLERS ========================== */

    // Your code here

    //Get all artists
    if (req.method === 'GET' && req.url === '/artists') {
      const data = JSON.stringify(Object.values(artists));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.write(data);
      return res.end();
    }

    //Get specific artist's details by artistId
    if (req.method === 'GET' && req.url.startsWith('/artists/') && req.url.split('/').length === 3) {
      const urlParts = req.url.split('/');
      const artistId = Number(urlParts[2]);
      const artist = artists[artistId];
      
      if (artist) {
        let artistData = artist;
        const artistAlbums = Object.values(albums).filter(album => album.artistId === artistId);

        if (artistAlbums.length > 0) {
          artistData = {...artist, albums: artistAlbums};
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(artistData));
        return res.end();
      } else {
        returnErrorMessage(res, 'Artist not found');
      }
    }

    //Add an artist
    if (req.method === 'POST' && req.url === '/artists') {
      if(req.body.name) {
        let artist = {
          artistId: getNewArtistId(),
          ...req.body
        }
        artists[artist.artistId] = artist;
        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(artist));
        return res.end();
      } else {
        returnErrorMessage(res, 'Something is wrong with the body');
      }
    }

    //Edit a specific artist by artistId
    if (['PUT','PATCH'].includes(req.method)  && req.url.startsWith('/artists/')) {
      const urlParts = req.url.split('/');
      const artistId = Number(urlParts[2]);
      const artist = artists[artistId];

      if (!req.body.name) {
        returnErrorMessage(res, 'Something is wrong with the body');
      }
      if (artist) {
        artist.name = req.body.name;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(artist));
        return res.end();
      }else {
        returnErrorMessage(res, 'Artist not found');
      }
    }


    //Delete a specific artist by artistId
    if (req.method ==='DELETE' && req.url.startsWith('/artists/')) {
      const urlParts = req.url.split('/');
      const artistId = Number(urlParts[2]);
      const artist = artists[artistId];

      if (artist) {
        albums = {...Object.values(albums).filter(album => album.artistId !== artistId)};
        artists = {...Object.values(artists).filter(artist => artist.artistId !== artistId)};
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({message: 'Sucessfully deleted'}));
        return res.end();
      } else {
        returnErrorMessage(res, 'Artist not found');
      }
    }


    //Get all albums of a specific artist by artistId
    if (req.method === 'GET' && req.url.startsWith('/artists/') && req.url.endsWith('/albums')) {
      const urlParts = req.url.split('/');
      const artistId = Number(urlParts[2]);
      const artistAlbums = Object.values(albums).filter(album => album.artistId === artistId);
    
      if (artistAlbums.length > 0) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(artistAlbums));
        return res.end();
      } else {
        returnErrorMessage(res, 'No albums found');
      }
    }


    //Get a specific album details by albumId
    if (req.method === 'GET' && req.url.startsWith('/albums/') && req.url.split('/').length === 3) {
      const urlParts = req.url.split('/');
      const albumId = Number(urlParts[2]);
      const album = albums[albumId];
      const artist = artists[album.artistId];
      
      if (album) {
        let albumData = album;
        const albumSongs = Object.values(songs).filter(song => song.albumId === albumId);

        if (albumSongs.length > 0) {
          albumData = {...album, artist: artist, songs: albumSongs};
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(albumData));
        return res.end();
      } else {
        returnErrorMessage(res, 'Album not found');
      }
    }


    //Add an album to a specific artist based on artistId
    if (req.method === 'POST' && req.url.startsWith('/artists/') && req.url.endsWith('/albums')) {
      const urlParts = req.url.split('/');
      const artistId = Number(urlParts[2]);
      
      if (!artists[artistId]){
        returnErrorMessage(res, 'Artist not found');
      }
    
      if (req.body.name) {
        let album = {
          albumId: getNewAlbumId(),
          name: req.body.name,
          artistId: artistId
        };
        albums[album.albumId] = album;
        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(album));
        return res.end();
      } else {
        returnErrorMessage(res, 'Something is wrong with the body');
      }
    }


    //Edit a specific album by albumId
    if (['PUT','PATCH'].includes(req.method)  && req.url.startsWith('/albums/') && req.url.split('/').length === 3) {
      const urlParts = req.url.split('/');
      const albumId = Number(urlParts[2]);
      const album = albums[albumId];
      
      if (!album){
        returnErrorMessage(res, 'Album not found');
      }
    
      if (req.body.name) {
        album.name = req.body.name;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(album));
        return res.end();
      } else {
        returnErrorMessage(res, 'Something is wrong with the body');
      }
    }


    //Delete a specific album by albumId
    if (req.method ==='DELETE' && req.url.startsWith('/albums/') && req.url.split('/').length === 3) {
      const urlParts = req.url.split('/');
      const albumId = Number(urlParts[2]);
      const album = albums[albumId];

      if (album) {
        songs = {...Object.values(songs).filter(song => song.albumId !== albumId)};
        albums = {...Object.values(albums).filter(album => album.albumId !== albumId)};
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({message: 'Sucessfully deleted'}));
        return res.end();
      } else {
        returnErrorMessage(res, 'Album not found');
      }
    }


    //Get all songs of a specific artist by artistId
    if (req.method === 'GET' && req.url.startsWith('/artists/') && req.url.endsWith('/songs')) {
      const urlParts = req.url.split('/');
      const artistId = Number(urlParts[2]);
      const artistAlbums = Object.values(albums).filter(album => album.artistId === artistId);
      const albumIds = artistAlbums.map((album => album.albumId));
      
      if (!artists[artistId]){
        returnErrorMessage(res, 'Artist not found');
      }

      if (artistAlbums.length > 0) {
        const artistSongs = Object.values(songs).filter(song => albumIds.includes(song.albumId));
        if (artistSongs.length > 0) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.write(JSON.stringify(artistSongs));
          return res.end();
        } else {
          returnErrorMessage(res, 'No songs found');
        }
      } else {
        returnErrorMessage(res, 'No albums found');
      }
    }


    //Get all songs of a specific album by albumtId
    if (req.method === 'GET' && req.url.startsWith('/albums/') && req.url.endsWith('/songs')) {
      const urlParts = req.url.split('/');
      const albumId = Number(urlParts[2]);
      const albumSongs = Object.values(songs).filter(song => song.albumId = albumId);
      
      if (!albums[albumId]){
        returnErrorMessage(res, 'Album not found');
      }

      if (albumSongs.length > 0) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(albumSongs));
        return res.end();
      } else {
        returnErrorMessage(res, 'No songs found');
      }
    }

    //Get all songs of a specified trackNumber
    if (req.method === 'GET' && req.url.startsWith('/trackNumbers/') && req.url.endsWith('/songs')) {
      const urlParts = req.url.split('/');
      const trackNumber = Number(urlParts[2]);
      const trackSongs = Object.values(songs).filter(song => song.trackNumber = trackNumber);
  
      if (trackSongs.length > 0) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(trackSongs));
        return res.end();
      } else {
        returnErrorMessage(res, 'No songs found');
      }
    }


    //Get a specific song details by songId
    if (req.method === 'GET' && req.url.startsWith('/songs/') && req.url.split('/').length === 3) {
      const urlParts = req.url.split('/');
      const songId = Number(urlParts[2]);
      const song = songs[songId];
      const album = albums[song.albumId];
      const artist = artists[album.artistId];
      
      if (song) {
        let songData = {...song, album: album, artist: artist};
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(songData));
        return res.end();
      } else {
        returnErrorMessage(res, 'Song not found');
      }
    }


    //Add an song to a specific album based on albumId
    if (req.method === 'POST' && req.url.startsWith('/albums/') && req.url.split('/').length === 3) {
      const urlParts = req.url.split('/');
      const albumId = Number(urlParts[2]);
      
      if (!albums[albumId]){
        returnErrorMessage(res, 'Album not found');
      }
    
      if (req.body.name && req.body.lyrics && req.body.trackNumber) {
        let song = {
          name: req.body.name,
          lyrics: req.body.lyrics,
          trackNumber: req.body.trackNumber,
          songId: getNewSongId(),
          albumId: albumId
        };
        songs[song.songId] = song;
        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(song));
        return res.end();
      } else {
        returnErrorMessage(res, 'Something is wrong with the body');
      }
    }


    //Edit a specific song by songId
    if (['PUT','PATCH'].includes(req.method)  && req.url.startsWith('/songs/') && req.url.split('/').length === 3) {
      const urlParts = req.url.split('/');
      const songId = Number(urlParts[2]);
      const song = songs[songId];
      
      if (!song){
        returnErrorMessage(res, 'Song not found');
      }
    
      if (req.body.name && req.body.lyrics && req.body.trackNumber) {
        song.name = req.body.name;
        song.lyrics = req.body.lyrics;
        song.trackNumber = req.body.trackNumber;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(song));
        return res.end();
      } else {
        returnErrorMessage(res, 'Something is wrong with the body');
      }
    }


    //Delete a specific song by songId
    if (req.method ==='DELETE' && req.url.startsWith('/songs/') && req.url.split('/').length === 3) {
      const urlParts = req.url.split('/');
      const songId = Number(urlParts[2]);

      if (songs[songId]) {
        songs = {...Object.values(songs).filter(song => song.songId !== songId)};
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({message: 'Sucessfully deleted'}));
        return res.end();
      } else {
        returnErrorMessage(res, 'Song not found');
      }
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.write("Endpoint not found");
    return res.end();
  });
});

function returnErrorMessage(res, message) {
  const data = JSON.stringify({message: message});
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.write(data);
  return res.end();
}
const port = process.env.PORT || 3000;

server.listen(port, () => console.log('Server is listening on port', port));