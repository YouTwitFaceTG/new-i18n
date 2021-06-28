import { Options, Language, Variables, Translation } from './types';

const checkFallback = (languages: string[], fallback?: string) => {
    if (fallback && !languages.includes(fallback)) {
        throw new Error(`The fallback language wasn't listed as a language.`);
    }
};

export class I18n {
    private _languages: Map<string, Language>;
    fallback?: string;

    constructor(options: Options) {
        if (`folder` in options) {
            checkFallback(options.languages, options.fallback);

            this.fallback = options.fallback;
            this._languages = new Map(
                options.languages.map(language => [language, require(`${options.folder}/${language}`)]),
            );
        } else {
            checkFallback(Object.keys(options.languages), options.fallback);

            this.fallback = options.fallback;
            this._languages = new Map(
                Object.entries(options.languages).map(([name, language]) => {
                    if (typeof language !== `object`) {
                        throw new Error(`Invalid language map: ${typeof language}`);
                    }

                    return [name, language];
                }),
            );
        }
    }

    get languages() {
        return [...this._languages.keys()];
    }

    private _fallback(language: string, keyword: string, variables: Variables = {}): Translation {
        if (this.fallback && language !== this.fallback) {
            return this.translate(this.fallback, keyword, variables);
        }

        return null;
    }

    translate(keyword: string, variables?: Variables): Translation;
    translate(language: string, keyword: string, variables?: Variables): Translation;
    translate(language: string, keyword?: string | Variables, variables?: Variables): Translation {
        if (keyword === undefined || typeof keyword === `object` && keyword !== null) {
            if (!this.fallback) {
                throw new Error(`No language or fallback specified`);
            }

            return this.translate(this.fallback, language, keyword);
        }

        const _variables = variables ?? {};

        if (!this._languages.has(language)) {
            return this._fallback(language, keyword, _variables);
        }

        const lang = this._languages.get(language);
        const keys = keyword.split(`.`);
        let value: Language | string | undefined = lang;

        for (const key of keys) {
            if (typeof value !== `object`) {
                break;
            }

            value = value[key];
        }

        if (!value || typeof value !== `string`) {
            return this._fallback(language, keyword, _variables);
        }

        return value.replace(/\{{2}(.+?)\}{2}/g, (_, variable: string) =>
            (_variables[variable] ?? variable).toString(),
        );
    }

    private _update(oldValues: Language, newValues: Language): Language {
        const result = { ...oldValues };

        for (const key in newValues) {
            if (typeof newValues[key] === `object`) {
                // eslint-disable-next-line no-extra-parens
                const currentValue = typeof result[key] !== `object` ? {} : (result[key] as Language);
                result[key] = this._update(currentValue, newValues[key] as Language);
            } else {
                result[key] = newValues[key];
            }
        }

        return result;
    }

    update(language: string, newValues: Language) {
        if (typeof language !== `string`) {
            throw new Error(`Invalid language type: ${typeof language}`);
        } else if (typeof newValues !== `object`) {
            throw new Error(`Invalid values type: ${typeof newValues}`);
        }

        const oldValues = this._languages.get(language);
        this._languages.set(language, this._update(oldValues || {}, newValues));
    }
}

export default I18n;
