import type { Theme } from '@react-navigation/native'
import { errors as errorsDictionary } from '@ui-schema/dictionary/en/errors'
import { getTranslatableEnum } from '@ui-schema/ui-schema/getTranslatableEnum'
import { Translator, TranslatorContext } from '@ui-schema/ui-schema/Translator'
import { beautifyKey } from '@ui-schema/ui-schema/Utils/beautify'
import { WidgetRenderer } from '@ui-schema/react/WidgetRenderer'
import { ObjectRenderer } from '@ui-schema/react/ObjectRenderer'
import { UIStoreProvider, createStore } from '@ui-schema/react/UIStore'
import { storeUpdater } from '@ui-schema/react/storeUpdater'
import { isInvalid } from '@ui-schema/react/isInvalid'
import { UIMetaProvider } from '@ui-schema/react/UIMeta'
import type { WidgetProps, BindingTypeGeneric } from '@ui-schema/react/Widget'
import { Translate } from '@ui-schema/react/Translate'
import { TranslateTitle } from '@ui-schema/react/TranslateTitle'
import { WidgetEngine } from '@ui-schema/react/WidgetEngine'
import { DefaultHandler } from '@ui-schema/react/DefaultHandler'
import { ValidityReporter } from '@ui-schema/react/ValidityReporter'
import { schemaPluginsAdapterBuilder } from '@ui-schema/react/SchemaPluginsAdapter'
import { createMap, createOrderedMap } from '@ui-schema/ui-schema/createMap'
import { translatorRelative } from '@ui-schema/ui-schema/TranslatorRelative'
import { Validator } from '@ui-schema/json-schema/Validator'
import { standardValidators } from '@ui-schema/json-schema/StandardValidators'
import { requiredValidatorLegacy } from '@ui-schema/json-schema/Validators/RequiredValidatorLegacy'
import { validatorPlugin } from '@ui-schema/json-schema/ValidatorPlugin'
import { requiredPlugin } from '@ui-schema/json-schema/RequiredPlugin'
import { useState, useEffect, useMemo, createContext, useContext, useCallback, ReactNode } from 'react'
import { List, Map, OrderedMap } from 'immutable'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View, ScrollView, Text, Pressable, TextInput, Switch, Linking } from 'react-native'
import {
    NavigationContainer,
    DefaultTheme as LightThemeBase,
    DarkTheme as DarkThemeBase,
    useTheme,
    Link,
} from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

const schemaBase = {
    type: 'object',
    properties: {
        country: {
            type: 'string',
            widget: 'Select',
            enum: [
                'mx',
                'my',
                'fj',
            ],
            default: 'fj',
            ttEnum: 'upper',
            t: {
                enum: {
                    mx: 'Mexico',
                    my: 'Malaysia',
                    fj: 'Fiji',
                },
            },
        },
        name: {
            type: 'string',
            maxLength: 20,
        },
        options: {
            type: 'object',
            properties: {
                notifications: {
                    type: 'boolean',
                    'default': false,
                },
            },
        },
    },
    required: [
        'country',
        'name',
    ],
}

function FormScreen() {
    const theme = useTheme()
    const [showValidity, setShowValidity] = useState(false)

    const [store, setStore] = useState(() => createStore(createOrderedMap({})))
    const [schema/*, setSchema*/] = useState(() => createOrderedMap(schemaBase))

    const onChange = useCallback((actions: any) => {
        setStore(storeUpdater(actions))
    }, [setStore])

    const invalid = isInvalid(store.getValidity())

    return (
        <SafeAreaView style={[styles.fill, {backgroundColor: theme.colors.background}]} edges={['bottom']}>
            <ScrollView style={styles.content}>
                <Text style={[styles.h1, {color: theme.colors.text}]}>Form Screen</Text>

                <Text style={{color: theme.colors.text, marginBottom: 12}}>
                    This form uses UI-Schema to render a simple input and a select field.
                    The validation is handled by UI-Schema's integrated JSON-Schema validator.
                </Text>

                <UIMetaProvider
                    binding={customBinding}
                    validate={validate}
                    t={t}
                >
                    <UIStoreProvider
                        store={store}
                        onChange={onChange}
                        showValidity={showValidity}
                    >
                        <GridContainer>
                            <WidgetEngine isRoot schema={schema}/>
                        </GridContainer>
                    </UIStoreProvider>
                </UIMetaProvider>

                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12,
                }}>
                    <Text
                        style={{
                            color:
                                invalid ? getColor('error', theme.dark) : theme.colors.text,
                        }}
                    >
                        {`Form is ${invalid ? 'invalid' : 'valid'}.`}
                    </Text>
                    <Pressable
                        onPress={() => {
                            setStore(store => store.set('values', OrderedMap()))
                            setShowValidity(false)
                        }}
                        style={({pressed}) => ({
                            padding: 8,
                            backgroundColor: theme.colors.card,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        <Text style={{color: theme.colors.text}}>Clear Form</Text>
                    </Pressable>
                </View>

                <View style={{
                    flexDirection: 'column',
                    marginTop: 12,
                    marginBottom: 12,
                }}>
                    <Pressable
                        onPress={() => setShowValidity(!showValidity)}
                        style={({pressed}) => ({
                            padding: 12,
                            backgroundColor: theme.colors.primary,
                            borderRadius: 4,
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        <Text style={{color: theme.colors.card, textAlign: 'center'}}>
                            {`${showValidity ? 'Hide' : 'Show'} Validity`}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const validator = Validator([
    ...standardValidators,
    requiredValidatorLegacy,
])
const validate = validator.validate

const dictionary = createMap({
    error: errorsDictionary,

    // looks like:
    // error: {
    //     'required-not-set': 'Please fill out this field.',
    // },
})

const t: Translator = (text, context, schema) => {
    const translation = dictionary.getIn(text.split('.'))
    if(typeof translation === 'string') {
        return translation
    }
    return translatorRelative(text, context, schema)
}

function GridContainer({children}: { children: ReactNode }) {
    return (
        <View style={{
            flexDirection: 'column',
            width: '100%',
            gap: 12,
        }}>
            {children}
        </View>
    )
}

const customBinding: BindingTypeGeneric = {
    WidgetRenderer: WidgetRenderer,

    // Note: This binding does not include a Grid, so all properties are rendered flat within the root GridContainer.
    // You can add a Grid by using a matching set of GridContainer, GroupRenderer, and GridItemPlugin.
    // GroupRenderer: null,

    widgets: {
        object: ObjectRenderer,
        string: StringWidget,
        boolean: BooleanWidget,
        Select: SelectWidget,
    },

    widgetPlugins: [
        DefaultHandler,

        schemaPluginsAdapterBuilder([
            // @ts-expect-error due to generic type
            validatorPlugin,
            requiredPlugin,
        ]),

        // GridItemPlugin,

        ValidityReporter,
    ],
}

function StringWidget(props: WidgetProps) {
    const {schema, value, onChange, showValidity, errors, required, storeKeys} = props
    const theme = useTheme()

    const error = showValidity && errors && errors.size > 0 ? errors.first() : undefined

    return (
        <View style={{marginBottom: 16}}>
            <Text style={{color: theme.colors.text, fontSize: 16, marginBottom: 4}}>
                <TranslateTitle schema={schema} storeKeys={storeKeys}/>
            </Text>

            <TextInput
                style={{
                    height: 40,
                    borderColor: error ? getColor('error', theme.dark) : theme.colors.border,
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    borderRadius: 4,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.card,
                }}
                onChangeText={(text) => onChange({
                    storeKeys,
                    scopes: ['value'],
                    type: 'set',
                    data: {
                        value: text,
                    },
                    schema,
                    required,
                })}
                value={typeof value === 'string' ? value : ''}
                placeholderTextColor={theme.colors.text + '88'}
            />
            {error ? <Text style={{color: getColor('error', theme.dark), fontSize: 12, marginTop: 4}}>
                <Translate
                    text={`error.${error?.get('error')}`}
                    context={
                        error.get('context') ?
                            error.get('context')!
                                .set('type', schema.get('type'))
                                .set('widget', schema.get('widget')) as TranslatorContext : undefined
                    }
                />
            </Text> : null}
        </View>
    )
}

function SelectWidget(props: WidgetProps) {
    const {schema, value, onChange, showValidity, errors, required, storeKeys} = props
    const theme = useTheme()
    const enumVal = schema.get('enum')
    const ttEnum = schema.get('ttEnum')

    const error = showValidity && errors && errors.size > 0 ? errors.first() : undefined

    return (
        <View style={{marginBottom: 16}}>
            <Text style={{color: theme.colors.text, fontSize: 16, marginBottom: 4}}>
                <TranslateTitle schema={schema} storeKeys={storeKeys}/>
            </Text>

            <View style={{
                borderColor: error ? getColor('error', theme.dark) : theme.colors.border,
                borderWidth: 1,
                borderRadius: 4,
                backgroundColor: theme.colors.card,
            }}>
                {enumVal && enumVal.map((enumVal: string) => (
                    <Pressable
                        key={enumVal}
                        onPress={() => onChange({
                            storeKeys,
                            scopes: ['value'],
                            type: 'set',
                            data: {value: enumVal},
                            schema,
                            required,
                        })}
                        style={({pressed}) => ({
                            padding: 12,
                            backgroundColor: value === enumVal ? theme.colors.primary + '33' : 'transparent',
                            borderBottomWidth: 1,
                            borderBottomColor: theme.colors.border,
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        <Text style={{color: theme.colors.text}}>
                            <Translate
                                schema={schema?.get('t')}
                                text={storeKeys.insert(0, 'widget').concat(List(['enum', getTranslatableEnum(enumVal)])).join('.')}
                                context={Map({'relative': List(['enum', getTranslatableEnum(enumVal)])})}
                                fallback={beautifyKey(getTranslatableEnum(enumVal), ttEnum)}
                            />
                        </Text>
                    </Pressable>
                ))}
            </View>
            {error ? <Text style={{color: getColor('error', theme.dark), fontSize: 12, marginTop: 4}}>
                <Translate
                    text={`error.${error?.get('error')}`}
                    context={
                        error.get('context') ?
                            error.get('context')!
                                .set('type', schema.get('type'))
                                .set('widget', schema.get('widget')) as TranslatorContext : undefined
                    }
                />
            </Text> : null}
        </View>
    )
}

function BooleanWidget(props: WidgetProps) {
    const {schema, value, onChange, showValidity, errors, required, storeKeys} = props
    const theme = useTheme()

    const error = showValidity && errors && errors.size > 0 ? errors.first() : undefined

    return (
        <View style={{marginBottom: 16}}>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: 40,
            }}>
                <Pressable
                    onPress={() => onChange({
                        storeKeys,
                        scopes: ['value'],
                        type: 'set',
                        data: {value: !value},
                        schema,
                        required,
                    })}
                    style={{
                        flex: 1,
                        paddingVertical: 8,
                        marginRight: 12,
                    }}
                >
                    <Text style={{color: error ? getColor('error', theme.dark) : theme.colors.text, fontSize: 16}}>
                        <TranslateTitle schema={schema} storeKeys={storeKeys}/>
                    </Text>
                </Pressable>
                <Switch
                    onValueChange={(val) => onChange({
                        storeKeys,
                        scopes: ['value'],
                        type: 'set',
                        data: {value: val},
                        schema,
                        required,
                    })}
                    value={Boolean(value)}
                    trackColor={{false: theme.colors.border, true: theme.colors.primary + '88'}}
                    thumbColor={Boolean(value) ? theme.colors.primary : theme.colors.text}
                />
            </View>

            {error ? <Text style={{color: getColor('error', theme.dark), fontSize: 12, marginTop: 4}}>
                <Translate
                    text={`error.${error?.get('error')}`}
                    context={
                        error.get('context') ?
                            error.get('context')!
                                .set('type', schema.get('type'))
                                .set('widget', schema.get('widget')) as TranslatorContext : undefined
                    }
                />
            </Text> : null}
        </View>
    )
}

// ---
// The next part is just the general react-native setup, nothing to do with UI-Schema.
// ---

function HomeScreen() {
    const theme = useTheme()
    return (
        <SafeAreaView style={[styles.fill, {backgroundColor: theme.colors.background}]} edges={['bottom']}>
            <ScrollView style={styles.content}>
                <Text style={[styles.h1, {color: theme.colors.text}]}>UI-Schema React Native Example</Text>

                <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
                    <Text style={{color: theme.colors.text}}>
                        This example app demonstrates how to use UI-Schema with React Native and Expo.
                        It features a simple form with string and select widgets, and showcases
                        theme switching using React Navigation's theming capabilities.
                        The form uses UI-Schema's validation and data binding.
                    </Text>
                </View>

                <View style={{marginTop: 24}}>
                    <Link screen="Form" params={{}} style={{
                        color: theme.colors.primary,
                        fontSize: 16,
                        marginBottom: 12,
                        textDecorationLine: 'underline',
                    }}>
                        Go to Form
                    </Link>
                    <Pressable
                        onPress={() => Linking.openURL('https://github.com/ui-schema/ui-schema')}
                        style={({pressed}) => ({
                            marginBottom: 12,
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        <Text style={{
                            color: theme.colors.primary,
                            fontSize: 16,
                            textDecorationLine: 'underline',
                        }}>
                            UI-Schema GitHub
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => Linking.openURL('https://github.com/ui-schema/demo-react-native')}
                        style={({pressed}) => ({
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        <Text style={{
                            color: theme.colors.primary,
                            fontSize: 16,
                            textDecorationLine: 'underline',
                        }}>
                            Demo GitHub Repository
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

function SettingsScreen() {
    const theme = useTheme()
    return (
        <SafeAreaView style={[styles.fill, {backgroundColor: theme.colors.background}]} edges={['bottom']}>
            <ScrollView style={styles.content}>
                <Text style={[styles.h2, {color: theme.colors.text}]}>Settings</Text>
                <Text style={{color: theme.colors.text}}>Preview theme tokens used by React Navigation.</Text>

                <View style={{marginTop: 12}}>
                    {Object.entries({
                        Primary: 'primary' as const,
                        Background: 'background' as const,
                        Card: 'card' as const,
                        Text: 'text' as const,
                    }).map(([label, key]) => (
                        <View key={key} style={{flexDirection: 'row', alignItems: 'center', marginVertical: 6}}>
                            <View style={{
                                width: 36,
                                height: 36,
                                borderRadius: 6,
                                backgroundColor: theme.colors[key],
                                marginRight: 12,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                            }}/>
                            <Text style={{color: theme.colors.text}}>{label}: {theme.colors[key]}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const STORAGE_KEY = 'APP_NAV_THEME'

const lightTheme: Theme = {
    ...LightThemeBase,
    colors: {
        ...LightThemeBase.colors,
        primary: '#1e88e5',
        background: '#f6f9fc',
        card: '#ffffff',
        text: '#121212',
        border: '#e6eef8',
    },
}

const darkTheme: Theme = {
    ...DarkThemeBase,
    colors: {
        ...DarkThemeBase.colors,
        primary: '#90caf9',
        background: '#121212',
        card: '#1f1f1f',
        text: '#ffffff',
        border: '#222',
    },
}

const colorfulTheme: Theme = {
    ...LightThemeBase,
    colors: {
        ...LightThemeBase.colors,
        primary: '#673ab7',
        background: '#e3f2fd',
        card: '#ede7f6',
        text: '#212121',
        border: '#d1c4e9',
    },
}

const colors = {
    dark: {
        error: '#ef9a9a',
    },
    light: {
        error: '#f44336',
    },
}

const getColor = (name: keyof typeof colors['dark' | 'light'], dark: boolean): string => {
    return dark ? colors.dark[name] : colors.light[name]
}

const availableThemes: Record<string, Theme> = {
    light: lightTheme,
    dark: darkTheme,
    blue: colorfulTheme,
}

const ThemeKeys = Object.keys(availableThemes)

const ThemeContext = createContext({
    themeKey: 'light',
    setThemeKey: (() => {
    }) as ((next: string) => void),
})

function useAppTheme() {
    return useContext(ThemeContext)
}

function HeaderThemeButton() {
    const {themeKey, setThemeKey} = useAppTheme()
    const theme = useTheme()
    return (
        <Pressable
            onPress={() => {
                const idx = ThemeKeys.indexOf(themeKey)
                const next = ThemeKeys[(idx + 1) % ThemeKeys.length]
                setThemeKey(next)
            }}
            style={({pressed}) => ({paddingHorizontal: 12, opacity: pressed ? 0.6 : 1})}
        >
            <MaterialIcons name="palette" size={20} color={theme.colors.text}/>
        </Pressable>
    )
}

const Tab = createBottomTabNavigator()

export default function App() {
    const [themeKey, setThemeKey] = useState('light')
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let mounted = true
        AsyncStorage.getItem(STORAGE_KEY).then(v => {
            if(!mounted) return
            if(v && availableThemes[v]) setThemeKey(v)
            setReady(true)
        }).catch(() => setReady(true))
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEY, themeKey).catch(() => {
        })
    }, [themeKey])

    const navTheme = useMemo(() => availableThemes[themeKey] || lightTheme, [themeKey])
    const contextValue = useMemo(() => ({themeKey, setThemeKey}), [themeKey])

    if(!ready) return null

    return (
        <ThemeContext.Provider value={contextValue}>
            <SafeAreaProvider>
                <NavigationContainer theme={navTheme}>
                    <StatusBar style={navTheme.dark ? 'light' : 'dark'}/>

                    <Tab.Navigator
                        screenOptions={({route}) => ({
                            headerRight: () => <HeaderThemeButton/>,
                            headerTitleAlign: 'center',
                            tabBarActiveTintColor: navTheme.colors.primary,
                            tabBarStyle: {
                                backgroundColor: navTheme.colors.card,
                                borderTopColor: navTheme.colors.border,
                            },
                            tabBarIcon: ({color, size}) => {
                                const icons: Record<string, 'home' | 'description' | 'settings'> = {
                                    'Home': 'home',
                                    'Form': 'description',
                                    'Settings': 'settings',
                                }
                                const name = icons[route.name]
                                return <MaterialIcons name={name} size={size} color={color}/>
                            },
                        })}
                    >
                        <Tab.Screen name="Home" component={HomeScreen}/>
                        <Tab.Screen name="Form" component={FormScreen}/>
                        <Tab.Screen name="Settings" component={SettingsScreen}/>
                    </Tab.Navigator>
                </NavigationContainer>
            </SafeAreaProvider>
        </ThemeContext.Provider>
    )
}

const styles = StyleSheet.create({
    fill: {flex: 1},
    content: {flex: 1, padding: 16},
    h1: {fontSize: 20, fontWeight: '600', marginBottom: 6},
    h2: {fontSize: 18, fontWeight: '600', marginBottom: 6},
    card: {padding: 12, borderRadius: 8, borderWidth: 1},
})
