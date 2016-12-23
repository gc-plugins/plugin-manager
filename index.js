'use strict';

let {app, shell} = require('electron'),
    {homedir} = require('os'),
    path = require('path'),
    jetpack = require('fs-jetpack'),
    fuzzy = require('fuzzy'),
    cfg_file = process.platform === 'win32'?
        path.resolve(
            app.getPath('userData'),
            'groundcontrol.json'
        ):
        path.resolve(homedir(), '.groundcontrol.json'),
    plugins = [
        {
            key: "@gc-plugins/package-managers",
            title: "Package Managers",
            description: "Searches packages on npm etc.",
            icon: encodeURI(
                'file://' + path.resolve(__dirname, 'img', 'default.svg')
            )
        }
    ];

exports.init = ({config}) => {};

exports.setConfig = () => {};

exports.process = ({keyword, term, stream}) => {
    let results = [];

    // If the term is empty, return no results.
    if (/^\s*$/.test(term)) {
        stream.end(undefined);
        return;
    }

    results = fuzzy.filter(term, plugins, {
            // Search on title, description and key.
            extract: (el) => `${el.title} ${el.description} ${el.key}`
        });

    results.forEach((el) => {
        let result = Object.assign({}, el.original);

        // Add the keyword, so we know what action to take later.
        result.key = `${keyword} ${result.key}`;
        stream.write(result);
    });
};

exports.execute = ({key}) => {
    return new Promise((resolve, reject) => {
        let config = require(cfg_file),
            matches = key.match(/^(install|uninstall)\s+(.*)/),
            action,
            pluginName;

        if (matches === null) {
            return;
        }

        [, action, pluginName] = matches;

        if (!config.plugins.includes(pluginName) && action === 'install') {
            config.plugins.push(pluginName);
        }
        else if (config.plugins.includes(pluginName) && action === 'uninstall') {
            let index = config.plugins.indexOf(pluginName);

            console.log(pluginName);
            console.log(index);
            config.plugins.splice(index, 1);
        }
        else {
            return;
        }

        jetpack.write(cfg_file, config, {atomic: true});

        // Relaunch the app to load the new plugin.
        app.relaunch();
        app.quit();
    });
};

exports.keyword = [
    'install',
    'uninstall',
];
