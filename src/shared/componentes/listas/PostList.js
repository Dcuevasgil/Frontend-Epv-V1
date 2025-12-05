import React from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PostList({
  data = [],
  ListHeaderComponent = null,
  ListEmptyComponent = null,
  refreshing = false,
  onRefresh,
  onEndReached,
  onPressPost, // (post) => {}
}) {
  const renderItem = ({ item }) => (
    <TouchableOpacity style={stylesPost.card} onPress={() => onPressPost?.(item)}>
      <View style={stylesPost.header}>
        <Image
          source={ item.usuario?.avatar ? { uri: item.usuario.avatar } : require('@asset/perfil.png') }
          style={stylesPost.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={stylesPost.nick}>@{item.usuario?.nick || 'usuario'}</Text>
          {!!item.fecha && <Text style={stylesPost.date}>{item.fecha}</Text>}
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
      </View>

      {!!item.texto && <Text style={stylesPost.texto}>{item.texto}</Text>}

      {!!item.imagen && (
        <Image
          source={{ uri: item.imagen }}
          style={stylesPost.media}
          resizeMode="cover"
        />
      )}

      <View style={stylesPost.footer}>
        <View style={stylesPost.footerBtn}>
          <Ionicons name="heart-outline" size={18} />
          <Text style={stylesPost.footerTxt}>{item.likes ?? 0}</Text>
        </View>
        <View style={stylesPost.footerBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} />
          <Text style={stylesPost.footerTxt}>{item.comentarios ?? 0}</Text>
        </View>
        <View style={stylesPost.footerBtn}>
          <Ionicons name="share-social-outline" size={18} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(it, idx) => String(it.id ?? idx)}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent ?? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: '#666' }}>Aún no hay publicaciones.</Text>
        </View>
      )}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    />
  );
}

const stylesPost = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eee' },
  nick: { fontWeight: '700', color: '#222' },
  date: { fontSize: 12, color: '#888' },
  texto: { color: '#222', marginTop: 4, lineHeight: 20 },
  media: { width: '100%', height: 200, borderRadius: 10, marginTop: 8, backgroundColor: '#eee' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 10 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerTxt: { color: '#333' },
});
