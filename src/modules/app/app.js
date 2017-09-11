(function () {
    'use strict';

    const modules = [];

    const origin = angular.module;
    angular.module = function (...args) {
        const [name] = args;
        if (modules.indexOf(name) === -1) {
            modules.push(name);
        }
        return origin.call(angular, ...args);
    };

    const app = angular.module('app', [
        'ngMaterial',
        'ngMessages',
        'ui.router',
        'ui.router.state.events',
        'n3-line-chart',

        'app.ui',
        'app.wallet',
        'app.dex',
        'app.welcome',
        'app.utils'
    ]);

    /**
     * @param $urlRouterProvider
     * @param $stateProvider
     * @param $locationProvider
     * @constructor
     */
    const AppConfig = function ($urlRouterProvider, $stateProvider, $locationProvider) {
        $locationProvider.html5Mode(true);

        i18next
            .use(i18nextXHRBackend)
            .use(i18nextBrowserLanguageDetector)
            .init({
                debug: true,
                ns: modules,
                fallbackLng: 'en',
                whitelist: ['en', 'ru'],
                defaultNS: 'app',
                useCookie: false,
                useLocalStorage: false,
                backend: {
                    loadPath: function (lng, ns) {
                        lng = lng[0];
                        ns = ns[0];
                        const parts = ns.split('.');
                        const path = parts.length === 1 ? ns : parts.filter((item) => item !== 'app')
                            .join('/modules/');
                        return `modules/${path}/locales/${lng}.json`;
                    }
                }
            });

        const getCtrlName = function (name) {
            return `${name.charAt(0)
                .toUpperCase() + name.substr(1)}Ctrl as $ctrl`;
        };
        const getTemplateUrl = function (name, type) {
            return `modules/${name}/templates/${type || name}.html`;
        };

        $stateProvider
            .state('welcome', {
                url: '/',
                views: {
                    main: {
                        controller: getCtrlName('welcome'),
                        templateUrl: getTemplateUrl('welcome')
                    }
                }
            })
            .state('main', {
                abstract: true,
                views: {
                    main: {
                        templateUrl: getTemplateUrl('app', 'main')
                    }
                }
            })
            .state('main.wallet', {
                url: '/wallet',
                redirectTo: 'main.wallet.assets',
                views: {
                    header: {
                        controller: getCtrlName('walletHeader'),
                        templateUrl: getTemplateUrl('wallet', 'header')
                    },
                    leftMenu: {
                        controller: getCtrlName('walletLeftMenu'),
                        templateUrl: getTemplateUrl('wallet', 'leftMenu')
                    },
                    mainContent: {
                        template: '<ui-view name="content"></ui-view>'
                    }
                }
            })
            .state('main.dex', {
                url: '/dex',
                views: {
                    header: {
                        controller: getCtrlName('dexHeader'),
                        templateUrl: getTemplateUrl('dex', 'header')
                    },
                    leftMenu: {
                        controller: getCtrlName('dexLeftMenu'),
                        templateUrl: getTemplateUrl('dex', 'leftMenu')
                    },
                    mainContent: {
                        controller: getCtrlName('dex'),
                        templateUrl: getTemplateUrl('dex', 'dex')
                    }
                }
            });
    };

    AppConfig.$inject = [
        '$urlRouterProvider', '$stateProvider', '$locationProvider'
    ];

    /**
     * @param $rootScope
     * @param {User} user
     * @constructor
     */
    const AppRun = function ($rootScope, user, $state) {

        const activeClasses = [];

        i18next.on('initialized', () => {
            const loader = $(document.querySelector('.app-loader'));
            loader.fadeOut(500, () => {
                loader.remove();
            });
        });

        /**
         *
         * @param {Event} event
         * @param {Object} toState
         * @param {string} toState.name
         */
        const onChangeStateSuccess = (event, toState) => {
            activeClasses.forEach((className) => {
                document.body.classList.remove(className);
            });
            activeClasses.splice(0, 1, activeClasses.length);
            toState.name.split('.')
                .filter(Boolean)
                .forEach((className) => {
                    const name = className.replace(/_/g, '-');
                    document.body.classList.add(name);
                    activeClasses.push(name);
                });
        };

        $rootScope.$on('$stateChangeSuccess', onChangeStateSuccess);

        const stop = $rootScope.$on('$stateChangeSuccess', (event, state, params) => {
            // ****************************************************************************************
            // REMOVE -- DEVELOP!!
            user.getUserList()
                .then((list) => {
                    if (list && list.length) {
                        user.addUserData(list[0]);
                    } else {
                        user.login()
                            .then(() => {
                                if (state.name.indexOf('welcome') !== 0) {
                                    $state.go(state.name, params);
                                } else {
                                    $state.go('main.wallet');
                                }
                            });
                    }
                });
            // REMOVE -- DEVELOP!!
            // ****************************************************************************************
            // user.login().then(() => {
            //     if (state.name.indexOf('welcome') !== 0) {
            //         $state.go(state.name, params);
            //     } else {
            //         $state.go('main.wallet');
            //     }
            // });
            stop();
        });

    };

    AppRun.$inject = ['$rootScope', 'user', '$state'];

    app.config(AppConfig);
    app.run(AppRun);
})();
