/*******************************************************************************
 * Freeciv-web - the web version of Freeciv. http://www.fciv.net/
 * Copyright (C) 2009-2017 The Freeciv-web project
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *******************************************************************************/
package org.freeciv.servlet;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;

import org.freeciv.util.Constants;
import org.json.JSONObject;

/**
 * Lists: the number of running games, the number of single player games played,
 * and the number of multi player games played.
 *
 * URL: /game/statistics
 */
public class GameStatistics extends HttpServlet {
	
	private static final long serialVersionUID = 1L;

	private static final String HEADER_EXPIRES = "Expires";
	
	private static final String CONTENT_TYPE = "application/json";
	
	private static final String INTERNAL_SERVER_ERROR = new JSONObject() //
			.put("statusCode", HttpServletResponse.SC_INTERNAL_SERVER_ERROR) //
			.put("error", "Internal server error.") //
			.toString();

	@Override
	public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {

		Connection conn = null;

		try {
			response.setContentType(CONTENT_TYPE);

			Context env = (Context) (new InitialContext().lookup(Constants.JNDI_CONNECTION));
			DataSource ds = (DataSource) env.lookup(Constants.JNDI_DDBBCON_MYSQL);
			conn = ds.getConnection();

			String query = "SELECT " //
					+ "	(SELECT COUNT(*) FROM servers WHERE state = 'Running') AS ongoingGames, " //
					+ "	(SELECT SUM(gameCount) FROM games_played_stats WHERE gametype IN (0, 5)) AS totalSinglePlayerGames, " //
					+ "	(SELECT SUM(gameCount) FROM games_played_stats WHERE gametype IN (1, 2)) AS totalMultiPlayerGames";

			PreparedStatement preparedStatement = conn.prepareStatement(query);
			ResultSet rs = preparedStatement.executeQuery();
			if (!rs.next()) {
				throw new Exception("Expected at least one row.");
			}

			JSONObject result = new JSONObject();
			result.put("ongoing", rs.getInt("ongoingGames"));
			JSONObject finishedGames = new JSONObject();
			finishedGames.put("singlePlayer", rs.getInt("totalSinglePlayerGames"));
			finishedGames.put("multiPlayer", rs.getInt("totalMultiPlayerGames"));
			result.put("finished", finishedGames);

			ZonedDateTime expires = ZonedDateTime.now(ZoneId.of("UTC")).plusHours(1);
			String rfc1123Expires = expires.format(DateTimeFormatter.RFC_1123_DATE_TIME);

			response.setHeader(HEADER_EXPIRES, rfc1123Expires);
			response.getOutputStream().print(result.toString());

		} catch (Exception err) {
			response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			response.getOutputStream().print(INTERNAL_SERVER_ERROR);
		} finally {
			if (conn != null) {
				try {
					conn.close();
				} catch (SQLException e) {
					e.printStackTrace();
				}
			}
		}
	}

}