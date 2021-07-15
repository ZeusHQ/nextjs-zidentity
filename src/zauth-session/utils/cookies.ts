import { IncomingMessage, ServerResponse } from 'http';
import { CookieSerializeOptions, parse, serialize } from 'cookie';

export const getAll = (req: IncomingMessage): { [key: string]: string } => {
  return parse(req.headers.cookie || '');
};

export const get = (req: IncomingMessage, name: string): string => {
  const cookies = getAll(req);
  return cookies[name];
};

export const set = (res: ServerResponse, name: string, value: string, options: CookieSerializeOptions = {}): void => {
  const strCookie = serialize(name, value, options);

  let previousCookies = res.getHeader('Set-Cookie') || [];
  if (!Array.isArray(previousCookies)) {
    previousCookies = [previousCookies as string];
  }

  res.setHeader('Set-Cookie', [...previousCookies, strCookie]);
};

export const clear = (res: ServerResponse, name: string, options: CookieSerializeOptions = {}): void => {
  set(res, name, '', { ...options, maxAge: 0 });
};
