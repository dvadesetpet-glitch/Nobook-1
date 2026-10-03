package com.ycngmn.nobook.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ycngmn.nobook.data.local.NobookDatabase
import com.ycngmn.nobook.data.local.entity.WatchHistory
import com.ycngmn.nobook.data.repository.WatchHistoryRepository
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class WatchHistoryViewModel(
    private val repository: WatchHistoryRepository
) : ViewModel() {
    val history: StateFlow<List<WatchHistory>> = repository.getRecentHistory()
        .stateIn(viewModelScope, started = kotlinx.coroutines.flow.SharingStarted.Lazily, initialValue = emptyList())

    val count: StateFlow<Int> = repository.getHistoryCount()
        .stateIn(viewModelScope, started = kotlinx.coroutines.flow.SharingStarted.Lazily, initialValue = 0)

    fun addWatch(url: String, title: String? = null, thumbnail: String? = null) {
        viewModelScope.launch {
            repository.addWatch(url, title, thumbnail)
        }
    }

    fun removeFromHistory(id: Long) {
        viewModelScope.launch {
            repository.removeFromHistory(id)
        }
    }

    fun clearAllHistory() {
        viewModelScope.launch {
            repository.clearAllHistory()
        }
    }

    class Factory(private val context: Context) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            val db = NobookDatabase.getDatabase(context)
            val repository = WatchHistoryRepository(db.watchHistoryDao())
            return WatchHistoryViewModel(repository) as T
        }
    }
}
