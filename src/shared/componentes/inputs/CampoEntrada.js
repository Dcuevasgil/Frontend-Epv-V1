import React from 'react';
import { TextInput, StyleSheet, Platform } from 'react-native';

const defaultAutofillProps = Platform.select({
  ios:   { textContentType: 'none', importantForAutofill: 'no', autoComplete: 'off' },
  android:{ importantForAutofill: 'no', autoComplete: 'off' },
});

const CampoEntrada = ({
  placeholder,
  placeholderTextColor,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize = 'none',
  secureTextEntry = false,
  ...rest
}) => {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      {...defaultAutofillProps}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    color: '#FFF',
  },
});

export default CampoEntrada;
