import path from 'path';

export const getNormalizedPath = (request: {
  path: string | false;
  request?: string;
}) => {
  const arr = `${request.path}${path.sep}${request.request}`.split(/[\/\\]/);
  const result: string[] = [];
  for (const item of arr) {
    if (item === '..') {
      result.pop();
    } else if (item !== '.') {
      result.push(item);
    }
  }
  // most of the tools only work with `/`
  return result.join('/');
};
