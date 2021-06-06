import api from './api';

export const CBR = 'CBR';
export const VBR = 'VBR';

export const search = ({ id, searchText }) => {
  return api.post(`/searches`, { id, searchText });
};

export const getStatus = async ({ id, includeResponses = false }) => {
  return (await api.get(`/searches/${encodeURIComponent(id)}?includeResponses=${includeResponses}`)).data;
};

export const getResponses = async ({ id }) => {
  return (await api.get(`/searches/${encodeURIComponent(id)}/responses`)).data;
};

export const isConstantBitRate = (bitRate) => {
  // because the caller most likely already O^2 this uses an ugly but fast approach
  // https://en.wikipedia.org/wiki/MP3#Bit_rate
  switch (bitRate) {
    case 8:
    case 16:
    case 24:
    case 32:
    case 40:
    case 48:
    case 56:
    case 64:
    case 80:
    case 96:
    case 112:
    case 128:
    case 144:
    case 160:
    case 192:
    case 224:
    case 256:
    case 320:
      return true;
    default:
      return false;
  }
}

export const parseFiltersFromString = (string) => {
  const filters = {
    minBitRate: 0,
    minFileSize: 0,
    minLength: 0,
    minFilesInFolder: 0,
    include: [],
    exclude: [],
    isVBR: false,
    isCBR: false
  };

  filters.minBitRate = getNthMatch(string, /(minbr|minbitrate):([0-9]+)/i, 2) || filters.minBitRate;
  filters.minFileSize = getNthMatch(string, /(minfs|minfilesize):([0-9]+)/i, 2) || filters.minFileSize;
  filters.minLength = getNthMatch(string, /(minlen|minlength):([0-9]+)/i, 2) || filters.minLength;
  filters.minFilesInFolder = getNthMatch(string, /(minfif|minfilesinfolder):([0-9]+)/i, 2) || filters.minFilesInFolder;
  
  filters.isVBR = !!string.match(/isvbr/i);
  filters.isCBR = !!string.match(/iscbr/i);

  const isReservedWord = (word) => word.includes(':') || word === 'isvbr' || word === 'iscbr';

  let terms = string.toLowerCase().split(' ').filter(term => !isReservedWord(term));

  filters.include = terms.filter(term => !term.startsWith('-'));
  filters.exclude = terms.filter(term => term.startsWith('-')).map(term => term.slice(1));

  return filters;
};

const getNthMatch = (string, regex, n) => {
  const match = string.match(regex);

  if (match) {
    return parseInt(match[n], 10);
  }
}

export const filterResponse = ({ 
  filters = {
    minBitRate: 0,
    minFileSize: 0,
    minLength: 0,
    include: [],
    exclude: [],
    isVBR: false,
    isCBR: false
  },
  response = { 
    files: [] 
  } 
}) => {
  let { files = [] } = response;

  if (response.fileCount + response.lockedFileCount < filters.minFilesInFolder) {
    return { ...response, files: [] }
  }

  console.log(filters);

  files = files.filter(file => {
    const { bitRate, size, length, filename } = file;
    const { isCBR, isVBR, minBitRate, minFileSize, minLength, include = [], exclude = [] } = filters;
  
    if (isCBR && !isConstantBitRate(bitRate)) return false;    
    if (isVBR && isConstantBitRate(bitRate)) return false;
    if (bitRate < minBitRate) return false;
    if (size < minFileSize) return false;
    if (length < minLength) return false;

    if (include.length > 0 && include.filter(term => filename.toLowerCase().includes(term)).length === 0) return false;
    if (exclude.length > 0 && exclude.filter(term => !filename.toLowerCase().includes(term)).length === 0) return false;

    return true;
  });

  return { ...response, files };
};