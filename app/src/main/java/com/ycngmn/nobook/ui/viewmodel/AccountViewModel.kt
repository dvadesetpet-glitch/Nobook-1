package com.ycngmn.nobook.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ycngmn.nobook.data.local.NobookDatabase
import com.ycngmn.nobook.data.local.entity.Account
import com.ycngmn.nobook.data.repository.AccountRepository
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class AccountViewModel(
    private val repository: AccountRepository
) : ViewModel() {
    val accounts: StateFlow<List<Account>> = repository.getAllAccounts()
        .stateIn(viewModelScope, started = kotlinx.coroutines.flow.SharingStarted.Lazily, initialValue = emptyList())

    val accountCount: StateFlow<Int> = repository.getAccountCount()
        .stateIn(viewModelScope, started = kotlinx.coroutines.flow.SharingStarted.Lazily, initialValue = 0)

    var activeAccount: Account? = null
        private set

    init {
        viewModelScope.launch {
            activeAccount = repository.getActiveAccount()
        }
    }

    fun addAccount(name: String, email: String) {
        viewModelScope.launch {
            repository.addAccount(name, email)
        }
    }

    fun switchAccount(accountId: Long) {
        viewModelScope.launch {
            repository.switchAccount(accountId)
            activeAccount = repository.getActiveAccount()
        }
    }

    fun removeAccount(accountId: Long) {
        viewModelScope.launch {
            repository.removeAccount(accountId)
            activeAccount = repository.getActiveAccount()
        }
    }

    fun refreshActiveAccount() {
        viewModelScope.launch {
            activeAccount = repository.getActiveAccount()
        }
    }

    class Factory(private val context: Context) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            val db = NobookDatabase.getDatabase(context)
            val repository = AccountRepository(db.accountDao())
            return AccountViewModel(repository) as T
        }
    }
}
