import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { searchBrands, addBrandToFirestore } from '../services/firestoreBrandsService';
import { addCustomBrand, searchCustomBrands } from '../services/customBrandsService';

interface BrandSuggestion {
  name: string;
  isCustom?: boolean;
  confidence?: number;
}

interface BrandAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function BrandAutocomplete({
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "words"
}: BrandAutocompleteProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [suggestions, setSuggestions] = useState<BrandSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isLoadingRef = useRef(false);

  const loadSuggestions = useCallback(async (searchText: string) => {
    if (!searchText.trim() || searchText.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const results: BrandSuggestion[] = [];

      const customBrands = await searchCustomBrands(searchText, 5);
      customBrands.forEach(cb => {
        results.push({
          name: cb.name,
          isCustom: true
        });
      });

      const firestoreBrands = await searchBrands(searchText, 5);
      firestoreBrands.forEach(brand => {
        if (!results.find(r => r.name.toLowerCase() === brand.toLowerCase())) {
          results.push({
            name: brand,
            isCustom: false
          });
        }
      });

      setSuggestions(results.slice(0, 8));
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.warn('Error loading brand suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadSuggestions(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, loadSuggestions]);

  const handleSelectSuggestion = (suggestion: BrandSuggestion) => {
    onChangeText(suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleAddNewBrand = async () => {
    const trimmedBrand = value.trim();

    if (!trimmedBrand || trimmedBrand.length < 2) {
      Alert.alert(
        t('brandAutocomplete.invalidBrand'),
        t('brandAutocomplete.invalidBrandMessage')
      );
      return;
    }

    Alert.alert(
      t('brandAutocomplete.newBrand'),
      t('brandAutocomplete.addBrandConfirm', { brand: trimmedBrand }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('brandAutocomplete.addButton'),
          onPress: async () => {
            const success = await addCustomBrand(trimmedBrand);
            if (success) {
              await addBrandToFirestore(trimmedBrand);
              setShowSuggestions(false);
              Alert.alert(
                t('brandAutocomplete.brandAdded'),
                t('brandAutocomplete.brandAddedMessage', { brand: trimmedBrand })
              );
            } else {
              Alert.alert(t('auth.error'), t('brandAutocomplete.brandAddError'));
            }
          }
        }
      ]
    );
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);
    if (!text.trim()) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
    // Don't toggle loading/suggestions visibility during typing to avoid flicker
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('brandAutocomplete.label')}</Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={placeholder || t('manualEntry.brandPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={handleTextChange}
          autoCapitalize={autoCapitalize}
          onFocus={() => value.trim().length >= 2 && setSuggestions(suggestions)}
        />
        <ActivityIndicator
          size="small"
          color={colors.accent}
          style={[styles.loadingIndicator, { opacity: isLoading ? 1 : 0 }]}
        />
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface }]}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.suggestionItem,
                  { borderBottomColor: colors.border }
                ]}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text style={[styles.suggestionText, { color: colors.textPrimary }]}>
                  {item.name}
                </Text>
                {item.isCustom && (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.badgeText, { color: colors.surface }]}>
                      {t('brandAutocomplete.customBadge')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={[styles.addButton, { borderTopColor: colors.border }]}
                onPress={handleAddNewBrand}
              >
                <Text style={[styles.addButtonText, { color: colors.accent }]}>
                  {t('brandAutocomplete.addNewBrand', { brand: value })}
                </Text>
              </TouchableOpacity>
            }
          />
        </View>
      )}

      {!showSuggestions && value.trim().length >= 2 && !isLoading && (
        <TouchableOpacity
          style={[styles.addNewButton, { backgroundColor: colors.surfaceAlt }]}
          onPress={handleAddNewBrand}
        >
          <Text style={[styles.addNewButtonText, { color: colors.accent }]}>
            {t('brandAutocomplete.addNewBrand', { brand: value })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10
  },
  inputContainer: {
    borderRadius: 18,
    marginTop: 20,
    padding: 16
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600'
  },
  loadingIndicator: {
    position: 'absolute',
    right: 16,
    top: 40
  },
  suggestionsContainer: {
    marginTop: 8,
    borderRadius: 18,
    maxHeight: 300,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  addButton: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center'
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  addNewButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
    borderRadius: 16
  },
  addNewButtonText: {
    fontSize: 14,
    fontWeight: '600'
  }
});
