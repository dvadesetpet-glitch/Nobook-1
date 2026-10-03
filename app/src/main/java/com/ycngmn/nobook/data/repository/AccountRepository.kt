package com.ycngmn.nobook.data.repository

import com.ycngmn.nobook.data.local.dao.AccountDao
import com.ycngmn.nobook.data.local.entity.Account
import kotlinx.coroutines.flow.Flow

class AccountRepository(private val dao: AccountDao) {
    fun getAllAccounts(): Flow<List<Account>> {
        return dao.getAllAccounts()
    }

    suspend fun getActiveAccount(): Account? {
        return dao.getActiveAccount()
    }

    suspend fun addAccount(name: String, email: String): Long {
        return dao.insert(Account(name = name, email = email))
    }

    suspend fun switchAccount(accountId: Long) {
        dao.deactivateAll()
        dao.setActiveAccount(accountId)
    }

    suspend fun removeAccount(accountId: Long) {
        dao.deleteById(accountId)
    }

    suspend fun updateAccount(account: Account) {
        dao.update(account)
    }

    fun getAccountCount(): Flow<Int> {
        return dao.getCount()
    }

    suspend fun getAccountById(accountId: Long): Account? {
        return dao.getAccountById(accountId)
    }
}
